import sys
import asyncio
import selectors

if __name__ == "__main__":
    import uvicorn
    from app.main import app
    from app.config import settings
    
    async def main():
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=8000,
            log_level="info",
            proxy_headers=True,
            forwarded_allow_ips=settings.FORWARDED_ALLOW_IPS,
        )
        server = uvicorn.Server(config)
        await server.serve()

    selector = selectors.SelectSelector()
    loop = asyncio.SelectorEventLoop(selector)
    asyncio.run(main(), loop_factory=lambda: loop)
