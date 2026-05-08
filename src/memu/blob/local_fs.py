from __future__ import annotations

import pathlib
import shutil
from urllib.parse import parse_qs, urlparse

import httpx


class LocalFS:
    def __init__(self, base_dir: str, allowed_dirs: list[str] | None = None):
        self.base = pathlib.Path(base_dir).resolve()
        self.base.mkdir(parents=True, exist_ok=True)
        self.allowed_dirs = [pathlib.Path(d).resolve() for d in (allowed_dirs or [])]

    def _get_filename_from_url(self, url: str, modality: str) -> str:
        """
        Extract a clean filename from URL, handling query parameters.

        Args:
            url: The URL to parse
            modality: The resource modality (for extension inference)

        Returns:
            A clean filename without query parameters
        """
        parsed = urlparse(url)
        path = parsed.path

        # Get base filename from path
        filename = pathlib.Path(path).name

        # If filename has no extension or is just a script name (like grab.php),
        # try to get the real extension from query parameters or use modality
        if not filename or "." not in filename or filename.endswith(".php"):
            # Check for 'type' parameter in query string (e.g., ?type=mp3)
            query_params = parse_qs(parsed.query)
            if "type" in query_params:
                ext = query_params["type"][0]
                # Generate a filename based on the ID if available
                filename = f"audio_{query_params['id'][0]}.{ext}" if "id" in query_params else f"resource.{ext}"
            else:
                # Use modality to infer extension
                ext_map = {
                    "audio": "mp3",
                    "video": "mp4",
                    "image": "jpg",
                    "document": "txt",
                }
                ext = ext_map.get(modality, "bin")
                filename = f"resource.{ext}"

        # Remove any remaining query parameters from filename
        filename = filename.split("?")[0]

        return filename

    def _validate_local_path(self, path: pathlib.Path) -> pathlib.Path:
        resolved = path.resolve()
        if self.allowed_dirs:
            if not any(
                str(resolved).startswith(str(allowed)) for allowed in self.allowed_dirs
            ):
                msg = f"Access denied: '{path}' is not in an allowed directory"
                raise PermissionError(msg)
        return resolved

    async def fetch(self, url: str, modality: str) -> tuple[str, str | None]:
        # Local path
        p = pathlib.Path(url)
        if p.exists():
            resolved = self._validate_local_path(p)
            dst = self.base / p.name
            if str(resolved) != str(dst.resolve()):
                shutil.copyfile(resolved, dst)
            text = None
            if modality in ("conversation", "text", "document"):
                text = dst.read_text(encoding="utf-8")
            return str(dst), text

        # HTTP - get clean filename
        filename = self._get_filename_from_url(url, modality)
        dst = self.base / filename

        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(url)
            r.raise_for_status()
            dst.write_bytes(r.content)
        text = None
        if modality in ("conversation", "text", "document"):
            text = r.text
        return str(dst), text
