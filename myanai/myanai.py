#!/usr/bin/env python3
"""
MyanAi — Low-Code AI Agent Builder v1.0.0
Myanmar's First AI Agent Framework for Myanos Web OS

Build custom AI agents with minimal code.
Define tools, personality, and workflows in simple YAML-like config.
Author: Meonnmi-ops (CTO, Myanos Project)
"""

import os, sys, json, time, re
from pathlib import Path
from typing import Dict, List, Any, Optional

VERSION = "1.0.0"
AGENTS_DIR = Path(__file__).parent / "agents"
TEMPLATES_DIR = Path(__file__).parent / "templates"

# ════════════════════════════════════════════════════════
# Agent Definition Schema
# ════════════════════════════════════════════════════════

class AgentDefinition:
    """Defines an AI agent's configuration"""

    SCHEMA = {
        "name": str,
        "version": str,
        "description": str,
        "author": str,
        "personality": str,       # System prompt / personality description
        "language": str,          # Response language (default: "myanmar")
        "greeting": str,          # First message to user
        "farewell": str,          # Last message
        "tools": list,            # List of tool definitions
        "workflows": list,        # Multi-step workflow definitions
        "memory": dict,           # Memory configuration
        "safety": dict,           # Safety rules
    }

    def __init__(self, config: Dict[str, Any]):
        self.config = self._validate(config)
        self.name = config.get("name", "Unnamed Agent")
        self.version = config.get("version", "1.0.0")
        self.tools = self._parse_tools(config.get("tools", []))
        self.workflows = config.get("workflows", [])
        self.created = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    def _validate(self, config):
        validated = {}
        for key, expected_type in self.SCHEMA.items():
            value = config.get(key)
            if value is not None and not isinstance(value, expected_type):
                if expected_type == list and isinstance(value, str):
                    validated[key] = [value]
                else:
                    validated[key] = value
            else:
                validated[key] = value
        # Defaults
        validated.setdefault("language", "myanmar")
        validated.setdefault("memory", {"enabled": True, "max_turns": 50})
        validated.setdefault("safety", {"max_retries": 3, "timeout": 30})
        return validated

    def _parse_tools(self, tools_raw):
        tools = []
        for t in tools_raw:
            if isinstance(t, str):
                # Built-in tool reference
                tools.append({"name": t, "type": "builtin", "enabled": True})
            elif isinstance(t, dict):
                tools.append(t)
        return tools

    def to_json(self):
        return json.dumps(self.config, indent=2, ensure_ascii=False)


# ════════════════════════════════════════════════════════
# Built-in Tools Registry
# ════════════════════════════════════════════════════════

BUILTIN_TOOLS = {
    "web_search": {
        "name": "web_search",
        "description": "အင်တာနက်ပေါ်မှ သတင်းရှာဖွေရန်",
        "params": ["query"],
        "example": "web_search: query='မြန်မာ့ သတင်း'",
    },
    "shell_command": {
        "name": "shell_command",
        "description": "Shell command အလုပ်ပြန်ရန်",
        "params": ["command"],
        "example": "shell_command: command='ls -la'",
    },
    "file_read": {
        "name": "file_read",
        "description": "ဖိုင်ဖတ်ရှုရန်",
        "params": ["path"],
        "example": "file_read: path='./myfile.txt'",
    },
    "file_write": {
        "name": "file_write",
        "description": "ဖိုင်ရေးရန်",
        "params": ["path", "content"],
        "example": "file_write: path='./out.txt', content='Hello'",
    },
    "python_exec": {
        "name": "python_exec",
        "description": "Python code အလုပ်ပြန်ရန်",
        "params": ["code"],
        "example": "python_exec: code='print(2+2)'",
    },
    "http_request": {
        "name": "http_request",
        "description": "HTTP request ပြုစုရန်",
        "params": ["url", "method"],
        "example": "http_request: url='https://api.example.com', method='GET'",
    },
    "send_notification": {
        "name": "send_notification",
        "description": "Notification ပေးရန်",
        "params": ["message", "title"],
        "example": "send_notification: title='Alert', message='Done!'",
    },
    "timer": {
        "name": "timer",
        "description": "Timer/Reminder သတ်မှတ်ရန်",
        "params": ["seconds", "message"],
        "example": "timer: seconds=60, message='Time up!'",
    },
}


# ════════════════════════════════════════════════════════
# Agent Runtime
# ════════════════════════════════════════════════════════

class AgentRuntime:
    """Runtime engine for executing AI agents"""

    def __init__(self, agent: AgentDefinition):
        self.agent = agent
        self.conversation_history = []
        self.memory = {}
        self.context = {}
        self.turn_count = 0
        self.max_turns = agent.config.get("memory", {}).get("max_turns", 50)

    def process_message(self, user_message: str) -> str:
        """Process user message and generate response"""
        self.turn_count += 1
        if self.turn_count > self.max_turns:
            return self._cleanup_and_respond()

        # Add to history
        self.conversation_history.append({
            "role": "user",
            "content": user_message,
            "timestamp": time.strftime("%H:%M:%S")
        })

        # Check for tool calls in message
        tool_result = self._check_tool_call(user_message)
        if tool_result:
            self.conversation_history.append({
                "role": "assistant",
                "content": tool_result,
                "timestamp": time.strftime("%H:%M:%S")
            })
            return tool_result

        # Generate response based on personality
        response = self._generate_response(user_message)
        self.conversation_history.append({
            "role": "assistant",
            "content": response,
            "timestamp": time.strftime("%H:%M:%S")
        })
        return response

    def _check_tool_call(self, message: str) -> Optional[str]:
        """Check if message contains a tool call pattern"""
        # Pattern: tool_name: param=value, param=value
        tool_pattern = r'^(\w+):\s*(.+)$'
        match = re.match(tool_pattern, message.strip())
        if not match:
            return None

        tool_name = match.group(1)
        params_str = match.group(2)

        # Parse params
        params = {}
        for pair in params_str.split(','):
            pair = pair.strip()
            if '=' in pair:
                k, v = pair.split('=', 1)
                params[k.strip()] = v.strip().strip("'\"")
            else:
                params['query'] = pair.strip().strip("'\"")

        # Execute tool
        return self._execute_tool(tool_name, params)

    def _execute_tool(self, tool_name: str, params: dict) -> str:
        """Execute a tool by name"""
        # Check built-in tools
        if tool_name in BUILTIN_TOOLS:
            return self._run_builtin_tool(tool_name, params)

        # Check custom tools
        for tool in self.agent.tools:
            if tool.get("name") == tool_name and tool.get("type") == "custom":
                return self._run_custom_tool(tool, params)

        return f"[Tool not found: {tool_name}]\nAvailable tools: {', '.join(self._list_tools())}"

    def _run_builtin_tool(self, name: str, params: dict) -> str:
        """Run a built-in tool"""
        try:
            if name == "shell_command":
                import subprocess
                cmd = params.get("command", "echo hello")
                r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
                result = r.stdout or r.stderr or "(no output)"
                return f"[Shell] $ {cmd}\n{result.strip()[:500]}"

            elif name == "python_exec":
                code = params.get("code", "print('hello')")
                try:
                    local_vars = {}
                    exec(code, {"__builtins__": __builtins__}, local_vars)
                    return f"[Python] Executed successfully"
                except Exception as e:
                    return f"[Python Error] {e}"

            elif name == "file_read":
                path = params.get("path", "")
                if os.path.exists(path):
                    with open(path) as f:
                        content = f.read()[:2000]
                    return f"[File: {path}]\n{content}"
                return f"[Error] File not found: {path}"

            elif name == "file_write":
                path = params.get("path", "output.txt")
                content = params.get("content", "")
                os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
                with open(path, 'w') as f:
                    f.write(content)
                return f"[OK] Written {len(content)} bytes to {path}"

            elif name == "web_search":
                query = params.get("query", "")
                return f"[Web Search] Searching: {query}\n(Note: Requires API integration for live search)"

            elif name == "http_request":
                url = params.get("url", "")
                method = params.get("method", "GET").upper()
                try:
                    import urllib.request
                    req = urllib.request.Request(url, method=method)
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        data = resp.read().decode('utf-8', errors='replace')[:1000]
                    return f"[HTTP {method} {url}]\n{data}"
                except Exception as e:
                    return f"[HTTP Error] {e}"

            elif name == "timer":
                secs = int(params.get("seconds", "5"))
                msg = params.get("message", "Time's up!")
                time.sleep(min(secs, 30))
                return f"⏰ {msg}"

            elif name == "send_notification":
                title = params.get("title", "Notification")
                msg = params.get("message", "")
                return f"🔔 [{title}] {msg}"

            return f"[Tool: {name}] Params: {params}"
        except Exception as e:
            return f"[Error] {e}"

    def _run_custom_tool(self, tool: dict, params: dict) -> str:
        """Run a custom tool defined in agent config"""
        script = tool.get("script", "")
        if script and os.path.exists(script):
            import subprocess
            r = subprocess.run(
                [sys.executable, script] + [f"{k}={v}" for k, v in params.items()],
                capture_output=True, text=True, timeout=30
            )
            return r.stdout or r.stderr or "Tool executed"
        return f"[Custom Tool: {tool.get('name')}] No script configured"

    def _generate_response(self, message: str) -> str:
        """Generate a response based on personality"""
        personality = self.agent.config.get("personality", "")
        lang = self.agent.config.get("language", "myanmar")

        # Check for greetings
        greetings = ["hello", "hi", "hey", "မင်္ဂလာပါ", "ဟဲ့လို", "ဘာလိုပါ"]
        if any(g in message.lower() for g in greetings):
            greeting = self.agent.config.get("greeting", f"မင်္ဂလာပါ! ကျွန်တော် {self.agent.name} ဖြစ်ပါတယ်။ ဘာကူညီပေးရမလဲ?")
            return greeting

        # Check for farewells
        farewells = ["bye", "exit", "quit", "ကျေးဇူးပါ", "ဆက်ပါ"]
        if any(f in message.lower() for f in farewells):
            farewell = self.agent.config.get("farewell", "ကျေးဇူးပါ! နောက်ထပ် တိုင်းကျွန်းစွာ!")
            return farewell

        # Check for help
        if "help" in message.lower() or "ကူညီ" in message:
            return self._generate_help()

        # Check for tool list
        if "tools" in message.lower() or "tool" in message.lower():
            return self._generate_tools_list()

        # Default response
        if lang == "myanmar":
            return f"[{self.agent.name}] ကျွန်တော်နားလည်ပါတယ်။ \"{message}\" ဆိုတဲ့ မေးခွန်းနဲ့ပတ်ဝန်းကျင်းဖြစ်ပါတယ်။\n\n" + self._generate_help()
        else:
            return f"[{self.agent.name}] I understand your message: \"{message}\"\n\n" + self._generate_help()

    def _generate_help(self) -> str:
        tools = self._list_tools()
        help_text = f"📋 {self.agent.name} Help\n"
        help_text += "─" * 40 + "\n"
        help_text += "Commands:\n"
        help_text += "  help      Show this help\n"
        help_text += "  tools     List available tools\n"
        help_text += "  info      Agent information\n"
        help_text += "  history   Conversation history\n"
        help_text += "  exit      Close agent\n\n"
        help_text += "Tool Usage:\n"
        help_text += "  tool_name: param=value, param=value\n\n"
        help_text += f"Available Tools ({len(tools)}):\n"
        for t in tools:
            help_text += f"  • {t}\n"
        return help_text

    def _generate_tools_list(self) -> str:
        tools_text = f"🔧 Tools ({len(self._list_tools())})\n"
        tools_text += "─" * 40 + "\n"

        # Built-in tools
        for name, info in BUILTIN_TOOLS.items():
            active = any(t.get("name") == name for t in self.agent.tools)
            status = "✅" if active else "⬜"
            tools_text += f"  {status} {name:<20} {info['description']}\n"
            tools_text += f"     Example: {info['example']}\n"

        return tools_text

    def _list_tools(self) -> List[str]:
        """List all available tool names"""
        names = []
        for t in self.agent.tools:
            if t.get("enabled", True):
                names.append(t.get("name", ""))
        return [n for n in names if n]

    def _cleanup_and_respond(self) -> str:
        farewell = self.agent.config.get("farewell", "Session ended.")
        return farewell

    def show_info(self):
        """Show agent information"""
        cfg = self.agent.config
        info = f"\n🤖 Agent: {cfg.get('name', 'Unknown')}\n"
        info += "═" * 45 + "\n"
        info += f"  Version:     {cfg.get('version', '?')}\n"
        info += f"  Author:      {cfg.get('author', '?')}\n"
        info += f"  Description: {cfg.get('description', '?')}\n"
        info += f"  Language:    {cfg.get('language', 'myanmar')}\n"
        info += f"  Tools:       {len(self.agent.tools)}\n"
        info += f"  Workflows:   {len(self.agent.workflows)}\n"
        info += f"  Turns:       {self.turn_count}/{self.max_turns}\n"
        info += "═" * 45 + "\n"
        return info

    def show_history(self):
        """Show conversation history"""
        if not self.conversation_history:
            return "[INFO] No conversation history"
        lines = []
        for entry in self.conversation_history:
            role = "👤" if entry["role"] == "user" else "🤖"
            time_str = entry.get("timestamp", "")
            content = entry["content"][:100]
            lines.append(f"  {role} [{time_str}] {content}")
        return "📜 Conversation History\n" + "─" * 45 + "\n" + "\n".join(lines)


# ════════════════════════════════════════════════════════
# Agent Builder (Low-Code)
# ════════════════════════════════════════════════════════

class AgentBuilder:
    """Low-code agent builder with templates"""

    TEMPLATES = {
        "assistant": {
            "name": "My Assistant",
            "version": "1.0.0",
            "description": "General purpose AI assistant",
            "author": "Myanos User",
            "personality": "You are a helpful AI assistant. Always respond in Myanmar language.",
            "language": "myanmar",
            "greeting": "မင်္ဂလာပါ! ကျွန်တော်နောက်လိုက်နေပါတယ်။ ဘာကူညီပေးရမလဲ?",
            "farewell": "ကျေးဇူးပါ! နောက်ထပ် တိုင်းဆက်ပေးပါ။",
            "tools": ["web_search", "shell_command", "file_read", "file_write", "python_exec"],
            "workflows": [],
            "memory": {"enabled": True, "max_turns": 100},
            "safety": {"max_retries": 3, "timeout": 30},
        },
        "coder": {
            "name": "Code Agent",
            "version": "1.0.0",
            "description": "Programming assistant that writes and executes code",
            "author": "Myanos User",
            "personality": "You are a coding expert. Write clean, efficient code. Explain in Myanmar.",
            "language": "myanmar",
            "greeting": "🧑‍💻 Code Agent စတင်ပါပြီ! ဘာ code ရေးပေးရမလဲ?",
            "farewell": "Goodbye! Happy coding! 🚀",
            "tools": ["python_exec", "shell_command", "file_write", "file_read"],
            "workflows": [],
            "memory": {"enabled": True, "max_turns": 50},
            "safety": {"max_retries": 3, "timeout": 60},
        },
        "monitor": {
            "name": "System Monitor Agent",
            "version": "1.0.0",
            "description": "Monitors system health and alerts on issues",
            "author": "Myanos User",
            "personality": "You are a system monitoring agent. Report system status concisely.",
            "language": "english",
            "greeting": "📊 System Monitor Active. Type 'status' for report.",
            "farewell": "Monitor stopped.",
            "tools": ["shell_command"],
            "workflows": [
                {"name": "status_check", "steps": ["shell_command: command='df -h'", "shell_command: command='free -h'"]},
            ],
            "memory": {"enabled": False, "max_turns": 200},
            "safety": {"max_retries": 1, "timeout": 10},
        },
        "researcher": {
            "name": "Research Agent",
            "version": "1.0.0",
            "description": "Web research agent that searches and summarizes information",
            "author": "Myanos User",
            "personality": "You are a research assistant. Find information and provide summaries in Myanmar.",
            "language": "myanmar",
            "greeting": "🔍 Research Agent ပြီး! ဘာအကြောင်းရှာစေးချင်ပါသလဲ?",
            "farewell": "ကျေးဇူးပါ!",
            "tools": ["web_search", "http_request", "file_write"],
            "workflows": [],
            "memory": {"enabled": True, "max_turns": 100},
            "safety": {"max_retries": 3, "timeout": 30},
        },
    }

    def create(self, name: str, template: str = "assistant", **kwargs) -> AgentDefinition:
        """Create agent from template"""
        if template not in self.TEMPLATES:
            raise ValueError(f"Unknown template: {template}. Available: {list(self.TEMPLATES.keys())}")

        config = dict(self.TEMPLATES[template])
        config["name"] = name
        config.update(kwargs)
        return AgentDefinition(config)

    def create_custom(self, name: str, personality: str, tools: list = None, **kwargs) -> AgentDefinition:
        """Create fully custom agent"""
        config = {
            "name": name,
            "version": kwargs.get("version", "1.0.0"),
            "description": kwargs.get("description", f"Custom agent: {name}"),
            "author": kwargs.get("author", "Myanos User"),
            "personality": personality,
            "language": kwargs.get("language", "myanmar"),
            "greeting": kwargs.get("greeting", f"မင်္ဂလာပါ! ကျွန်တော် {name} ဖြစ်ပါတယ်။"),
            "farewell": kwargs.get("farewell", "ကျေးဇူးပါ!"),
            "tools": tools or ["web_search", "shell_command"],
            "workflows": [],
            "memory": {"enabled": True, "max_turns": 50},
            "safety": {"max_retries": 3, "timeout": 30},
        }
        return AgentDefinition(config)

    def save(self, agent: AgentDefinition, path: str = None):
        """Save agent config to file"""
        if path is None:
            AGENTS_DIR.mkdir(exist_ok=True)
            path = str(AGENTS_DIR / f"{agent.name.lower().replace(' ', '-')}.json")

        with open(path, 'w') as f:
            json.dump(agent.config, f, indent=2, ensure_ascii=False)
        return path

    def load(self, path: str) -> AgentDefinition:
        """Load agent config from file"""
        with open(path) as f:
            config = json.load(f)
        return AgentDefinition(config)

    def list_agents(self):
        """List saved agents"""
        if not AGENTS_DIR.exists():
            return []
        agents = []
        for f in sorted(AGENTS_DIR.glob("*.json")):
            try:
                with open(f) as fp:
                    cfg = json.load(fp)
                agents.append({
                    "name": cfg.get("name", f.stem),
                    "version": cfg.get("version", "?"),
                    "description": cfg.get("description", ""),
                    "file": str(f),
                })
            except:
                pass
        return agents

    def list_templates(self):
        """List available templates"""
        return {name: {"description": t["description"], "tools": t["tools"]} for name, t in self.TEMPLATES.items()}


# ════════════════════════════════════════════════════════
# Interactive CLI
# ════════════════════════════════════════════════════════

def run_interactive(agent: AgentDefinition):
    """Run agent in interactive mode"""
    runtime = AgentRuntime(agent)
    print(f"\n🤖 {agent.name} v{agent.version}")
    print(f"   {agent.config.get('description', '')}")
    print(f"   Type 'help' for commands, 'exit' to quit\n")

    # Show greeting
    greeting = agent.config.get("greeting", "")
    if greeting:
        print(f"🤖 {greeting}\n")

    while True:
        try:
            user_input = input("You > ").strip()
            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit"):
                farewell = agent.config.get("farewell", "Goodbye!")
                print(f"🤖 {farewell}")
                break
            elif user_input == "help":
                print(runtime._generate_help())
            elif user_input == "tools":
                print(runtime._generate_tools_list())
            elif user_input == "info":
                print(runtime.show_info())
            elif user_input == "history":
                print(runtime.show_history())
            else:
                response = runtime.process_message(user_input)
                print(f"\n🤖 {response}\n")

        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except EOFError:
            break


def main():
    import argparse

    parser = argparse.ArgumentParser(description="MyanAi — AI Agent Builder v1.0.0")
    sub = parser.add_subparsers(dest="command")

    # Create
    create_p = sub.add_parser("create", help="Create a new agent")
    create_p.add_argument("--name", required=True, help="Agent name")
    create_p.add_argument("--template", default="assistant", help="Template name")
    create_p.add_argument("--personality", help="Custom personality prompt")
    create_p.add_argument("--tools", nargs="+", help="Tools to include")
    create_p.add_argument("--language", default="myanmar", help="Response language")
    create_p.add_argument("--save", action="store_true", help="Save to file")

    # Run
    run_p = sub.add_parser("run", help="Run an agent")
    run_p.add_argument("--file", help="Agent config file")
    run_p.add_argument("--template", default="assistant", help="Template to run")
    run_p.add_argument("--name", help="Agent name (for saved agents)")

    # List
    sub.add_parser("list", help="List saved agents")
    sub.add_parser("templates", help="List available templates")
    sub.add_parser("info", help="Show MyanAi info")

    args = parser.parse_args()
    builder = AgentBuilder()

    if args.command == "create":
        if args.personality:
            agent = builder.create_custom(
                name=args.name,
                personality=args.personality,
                tools=args.tools,
                language=args.language,
            )
        else:
            agent = builder.create(
                name=args.name,
                template=args.template,
                language=args.language,
            )
        print(f"[OK] Agent created: {agent.name}")
        print(f"     Version: {agent.version}")
        print(f"     Tools: {len(agent.tools)}")
        print(f"     Language: {agent.config.get('language')}")
        if args.save:
            path = builder.save(agent)
            print(f"     Saved: {path}")

    elif args.command == "run":
        if args.file:
            agent = builder.load(args.file)
        elif args.name:
            agents = builder.list_agents()
            found = [a for a in agents if a["name"].lower() == args.name.lower()]
            if found:
                agent = builder.load(found[0]["file"])
            else:
                print(f"[ERR] Agent not found: {args.name}")
                return
        else:
            agent = builder.create(name="Quick Agent", template=args.template)
        run_interactive(agent)

    elif args.command == "list":
        agents = builder.list_agents()
        if not agents:
            print("[INFO] No saved agents")
        else:
            print(f"🤖 Saved Agents ({len(agents)}):\n")
            for a in agents:
                print(f"  • {a['name']} v{a['version']}")
                print(f"    {a['description']}")
                print(f"    File: {a['file']}\n")

    elif args.command == "templates":
        templates = builder.list_templates()
        print(f"📋 Templates ({len(templates)}):\n")
        for name, info in templates.items():
            print(f"  [{name}]")
            print(f"    {info['description']}")
            print(f"    Tools: {', '.join(info['tools'])}\n")

    elif args.command == "info":
        print(f"\n🤖 MyanAi v{VERSION}")
        print("═" * 45)
        print(f"  Low-Code AI Agent Builder for Myanos OS")
        print(f"  Built-in Tools: {len(BUILTIN_TOOLS)}")
        print(f"  Templates: {len(builder.TEMPLATES)}")
        print(f"  Agents Dir: {AGENTS_DIR}")
        print("═" * 45)
        print("\nCommands:")
        print("  myanai create --name 'Agent' --template assistant")
        print("  myanai create --name 'Agent' --personality '...'")
        print("  myanai run --template coder")
        print("  myanai run --file agent.json")
        print("  myanai list")
        print("  myanai templates")

    else:
        parser.print_help()

if __name__ == "__main__":
    main()
