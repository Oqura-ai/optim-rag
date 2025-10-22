from fastmcp import FastMCP
from main import app

# Convert to MCP server
mcp = FastMCP.from_fastapi(app=app)

# Run the MCP server
if __name__ == "__main__":
    mcp.run()
