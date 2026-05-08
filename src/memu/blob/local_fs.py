from __future__ import annotations

import ipaddress
import pathlib
import shutil
from urllib.parse import parse_qs, urlparse

import httpx


_PRIVATE_IP_BLOCKS: list[str] = [
    "127.0.0.0/8",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "169.254.0.0/16",
    "::1/128",
    "fc00::/7",
    "fe80::/10",
]

_MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


def _is_private_host(host: str) -> bool:
    try:
        addr = ipaddress.ip_address(host)
        for block in _PRIVATE_IP_BLOCKS:
            if addr in ipaddress.ip_network(block):
                return True
    except ValueError:
        pass
    return False


def _resolve_host(url: str) -> str | None:
    parsed = urlparse(url)
    host = parsed.hostname
    if host is None:
        return None
    return host


class LocalFS:
    def __init__(self, base_dir: str):
        self.base = pathlib.Path(base_dir).resolve()
        self.base.mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, dst: pathlib.Path) -> pathlib.Path:
        dst_resolved = dst.resolve()
        try:
            dst_resolved.relative_to(self.base)
        except ValueError:
            msg = f"Path traversal denied: {dst} is outside base directory {self.base}"
            raise PermissionError(msg)
        return dst_resolved

    def _get_filename_from_url(self, url: str, modality: str) -> str:
        parsed = urlparse(url)
        path = parsed.path

        filename = pathlib.Path(path).name

        if not filename or "." not in filename or filename.endswith(".php"):
            query_params = parse_qs(parsed.query)
            if "type" in query_params:
                ext = query_params["type"][0]
                filename = f"audio_{query_params['id'][0]}.{ext}" if "id" in query_params else f"resource.{ext}"
            else:
                ext_map = {
                    "audio": "mp3",
                    "video": "mp4",
                    "image": "jpg",
                    "document": "txt",
                }
                ext = ext_map.get(modality, "bin")
                filename = f"resource.{ext}"

        filename = filename.split("?")[0]

        return filename

    async def fetch(self, url: str, modality: str) -> tuple[str, str | None]:
        p = pathlib.Path(url)
        if p.exists():
            src_resolved = p.resolve()
            dst = self.base / p.name
            dst = self._resolve_safe_path(dst)
            if str(src_resolved) != str(dst):
                if src_resolved.parent == self.base:
                    msg = f"File already in base directory: {url}"
                    raise PermissionError(msg)
                shutil.copyfile(src_resolved, dst)
            text = None
            if modality in ("conversation", "text", "document"):
                text = dst.read_text(encoding="utf-8")
            return str(dst), text

        host = _resolve_host(url)
        if host is None:
            msg = f"Invalid URL: {url}"
            raise ValueError(msg)
        if _is_private_host(host):
            msg = f"SSRF blocked: requests to private/reserved IPs are not allowed (host: {host})"
            raise PermissionError(msg)

        filename = self._get_filename_from_url(url, modality)
        dst = self.base / filename
        dst = self._resolve_safe_path(dst)

        async with httpx.AsyncClient(timeout=60, follow_redirects=False) as client:
            r = await client.get(url)
            r.raise_for_status()
            content = r.content
            if len(content) > _MAX_DOWNLOAD_BYTES:
                msg = f"Download too large: {len(content)} bytes exceeds limit of {_MAX_DOWNLOAD_BYTES} bytes"
                raise ValueError(msg)
            dst.write_bytes(content)
        text = None
        if modality in ("conversation", "text", "document"):
            text = r.text
        return str(dst), text
