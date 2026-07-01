#!/usr/bin/env python3
"""Learning Log MCP Server — Entry Point
======================================
Thin entry point for MCP protocol server.
Actual logic lives in protocols/mcp.py.
Referenced by .mcp.json for STDIO and llmcp for SSE.
"""
import asyncio
import sys
import os

# Add the root directory to the path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def main():
    from protocols.mcp import main as _mcp_main
    asyncio.run(_mcp_main())

if __name__ == "__main__":
    main()
