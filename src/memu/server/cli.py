from __future__ import annotations

import os
import sys
import tempfile
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from memu.app import MemoryService

memory_service: MemoryService | None = None


def _get_env_or_warn(var: str, default: str | None = None) -> str | None:
    val = os.environ.get(var, default)
    if not val:
        print(f"  ! WARNING: {var} is not set")
        return None
    return val


def build_llm_profiles() -> dict[str, Any]:
    base_url = _get_env_or_warn("OPENAI_BASE_URL", "https://api.openai.com/v1") or ""
    api_key = _get_env_or_warn("OPENAI_API_KEY")
    return {
        "default": {
            "provider": os.environ.get("LLM_PROVIDER", "openai"),
            "base_url": base_url,
            "api_key": api_key or "",
            "chat_model": os.environ.get("CHAT_MODEL", "gpt-4o-mini"),
            "client_backend": os.environ.get("LLM_CLIENT_BACKEND", "sdk"),
        },
        "embedding": {
            "provider": os.environ.get("EMBED_PROVIDER", "openai"),
            "base_url": base_url,
            "api_key": api_key or "",
            "embed_model": os.environ.get("EMBED_MODEL", "text-embedding-3-small"),
            "client_backend": os.environ.get("EMBED_CLIENT_BACKEND", "sdk"),
        },
    }


def get_service() -> MemoryService:
    if memory_service is None:
        raise HTTPException(status_code=503, detail="Memory service not initialized")
    return memory_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global memory_service
    try:
        llm_profiles = build_llm_profiles()
        memory_service = MemoryService(
            llm_profiles=llm_profiles,
            database_config={
                "metadata_store": {
                    "provider": os.environ.get("MEMU_STORE", "inmemory"),
                },
            },
        )
        print("memU MemoryService initialized")
    except Exception as exc:
        print(f"Failed to initialize MemoryService: {exc}")
        raise
    yield
    print("Shutting down memU server...")


app = FastAPI(
    title="memU API",
    description="Memory management API powered by memU",
    version="1.5.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MemorizeRequest(BaseModel):
    content: str
    modality: str = "text"
    user_id: str | None = None


class MemorizeResponse(BaseModel):
    status: str
    items_created: int
    categories: int
    result: dict[str, Any]


class RetrieveRequest(BaseModel):
    queries: list[dict[str, str]]
    where: dict[str, Any] | None = None


class CreateItemRequest(BaseModel):
    memory_type: str
    memory_content: str
    memory_categories: list[str] = []
    user_id: str | None = None


class UpdateItemRequest(BaseModel):
    memory_type: str | None = None
    memory_content: str | None = None
    memory_categories: list[str] | None = None
    user_id: str | None = None


class ClearMemoryRequest(BaseModel):
    where: dict[str, Any] | None = None


class ConfigResponse(BaseModel):
    version: str
    llm_profiles: list[str]
    storage: dict[str, str | None]
    memory_types: list[str]
    default_categories: list[dict[str, str]]


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "memU",
        "version": "1.5.1",
        "memory_service_initialized": memory_service is not None,
    }


@app.get("/api/v1/config")
async def get_config() -> ConfigResponse:
    svc = get_service()
    from typing import get_args
    from memu.database.models import MemoryType

    cfg = svc._provider_summary()
    return ConfigResponse(
        version="1.5.1",
        llm_profiles=cfg["llm_profiles"],
        storage=cfg["storage"],
        memory_types=list(get_args(MemoryType)),
        default_categories=[
            {"name": c.name, "description": c.description}
            for c in (svc.category_configs if hasattr(svc, "category_configs") else [])
        ],
    )


@app.post("/api/v1/memorize", response_model=MemorizeResponse)
async def memorize(request: MemorizeRequest):
    svc = get_service()
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write(request.content)
            tmp = f.name
        try:
            user = {"user_id": request.user_id} if request.user_id else None
            result = await svc.memorize(
                resource_url=tmp,
                modality=request.modality,
                user=user,
            )
            return MemorizeResponse(
                status="ok",
                items_created=len(result.get("items", [])),
                categories=len(result.get("categories", [])),
                result=result,
            )
        finally:
            os.unlink(tmp)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/retrieve")
async def retrieve(request: RetrieveRequest):
    svc = get_service()
    try:
        result = await svc.retrieve(queries=request.queries, where=request.where)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/v1/items")
async def list_items(user_id: str | None = None):
    svc = get_service()
    where = {"user_id": user_id} if user_id else None
    try:
        return await svc.list_memory_items(where=where)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/v1/categories")
async def list_categories(user_id: str | None = None):
    svc = get_service()
    where = {"user_id": user_id} if user_id else None
    try:
        return await svc.list_memory_categories(where=where)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/items")
async def create_item(request: CreateItemRequest):
    svc = get_service()
    try:
        user = {"user_id": request.user_id} if request.user_id else None
        result = await svc.create_memory_item(
            memory_type=request.memory_type,
            memory_content=request.memory_content,
            memory_categories=request.memory_categories,
            user=user,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.put("/api/v1/items/{item_id}")
async def update_item(item_id: str, request: UpdateItemRequest):
    svc = get_service()
    try:
        user = {"user_id": request.user_id} if request.user_id else None
        result = await svc.update_memory_item(
            memory_id=item_id,
            memory_type=request.memory_type,
            memory_content=request.memory_content,
            memory_categories=request.memory_categories,
            user=user,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.delete("/api/v1/items/{item_id}")
async def delete_item(item_id: str, user_id: str | None = None):
    svc = get_service()
    try:
        user = {"user_id": user_id} if user_id else None
        return await svc.delete_memory_item(memory_id=item_id, user=user)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/clear")
async def clear_memory(request: ClearMemoryRequest):
    svc = get_service()
    try:
        return await svc.clear_memory(where=request.where)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def main() -> None:
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    print(f"memU server starting on {host}:{port}")
    print(f"API docs available at http://localhost:{port}/docs")
    uvicorn.run("memu.server.cli:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
