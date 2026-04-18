import argparse

import uvicorn


def run_server(host: str = "127.0.0.1", port: int = 8000, reload: bool = False) -> None:
    uvicorn.run("main:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="App FastAPI per consultar dades de centres educatius.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--reload", action="store_true", help="Activa autoreload de desenvolupament")
    args = parser.parse_args()

    run_server(host=args.host, port=args.port, reload=args.reload)
