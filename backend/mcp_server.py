"""
Learning Log MCP Server — Entry Point
======================================
Thin entry point for MCP protocol server.
Actual logic lives in protocols/mcp.py.
Referenced by .mcp.json for STDIO and llmcp for SSE.
"""
import asyncio
import sys


def main():
    from protocols.mcp import main as _mcp_main
    asyncio.run(_mcp_main())


if __name__ == "__main__":
    main()