#!/usr/bin/env python3
"""
MyanAi — Low-Code AI Agent Builder v2.0.0
Myanmar's First AI Agent Framework for Myanos Web OS

v2.0.0 Changes:
  - Live Web Search (DuckDuckGo integration)
  - Live AI Chat (OpenAI / Ollama / Custom API)
  - API configuration management
  - Enhanced tool execution with real APIs
  - REST API server mode for desktop integration

Build custom AI agents with minimal code.
Define tools, personality, and workflows in simple config.

Author: Meonnmi-ops (CTO, Myanos Project)
"""

import os
import sys
import json
import time
import re
import argparse
import subprocess
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from typing import Dict, List, Any, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler

VERSION = "2.0.0"
BASE_DIR = Path(__file__).parent
AGENTS_DIR = BASE_DIR / "agents"
TEMPLATES_DIR = BASE_DIR / "templates"

# ── Import API Client ──
try:
    from api_client import Config as APIConfig, Cache, WebSearch, AIChat
    HAS_API = True
except ImportError:
    HAS_API = False


# ════════════════════════════════════════════════════════
# Agent Definition Schema
# ════════════════════════════════════════════════════════

class AgentDefinition:
    """Defines an AI agent's configuration"""

    SCHEMA = {
        "name": str, "version": str, "description": str, "author": str,
        "personality": str, "language": str, "greeting": str, "farewell": str,
        "tools": list, "workflows": list, "memory": dict, "safety": dict,
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
        validated.setdefault("language", "myanmar")
        validated.setdefault("memory", {"enabled": True, "max_turns": 50})
        validated.setdefault("safety", {"max_retries": 3, "timeout": 30})
        return validated

    def _parse_tools(self, tools_raw):
        tools = []
        for t in tools_raw:
            if isinstance(t, str):
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
        "name": "web_search", "description": "အင်တာနက်ပေါ်မှ သတင်းရှာဖွေရန် (Live)",
        "params": ["query"],
        "example": "web_search: query='မြန်မာ့ သတင်း'",
        "live": True,
    },
    "ai_chat": {
        "name": "ai_chat", "description": "AI နှင့် စပြီး ဆက်စပ်မှု (Live)",
        "params": ["message"],
        "example": "ai_chat: message='မြန်မာ့ အကြောင်း ပြောပေး'",
        "live": True,
    },
    "shell_command": {
        "name": "shell_command", "description": "Shell command အလုပ်ပြန်ရန်",
        "params": ["command"], "example": "shell_command: command='ls -la'",
    },
    "file_read": {
        "name": "file_read", "description": "ဖိုင်ဖတ်ရှုရန်",
        "params": ["path"], "example": "file_read: path='./myfile.txt'",
    },
    "file_write": {
        "name": "file_write", "description": "ဖိုင်ရေးရန်",
        "params": ["path", "content"],
        "example": "file_write: path='./out.txt', content='Hello'",
    },
    "python_exec": {
        "name": "python_exec", "description": "Python code အလုပ်ပြန်ရန်",
        "params": ["code"], "example": "python_exec: code='print(2+2)'",
    },
    "http_request": {
        "name": "http_request", "description": "HTTP request ပြုစုရန်",
        "params": ["url", "method"],
        "example": "http_request: url='https://api.example.com', method='GET'",
    },
    "send_notification": {
        "name": "send_notification", "description": "Notification ပေးရန်",
        "params": ["message", "title"],
        "example": "send_notification: title='Alert', message='Done!'",
    },
    "timer": {
        "name": "timer", "description": "Timer/Reminder သတ်မှတ်ရန်",
        "params": ["seconds", "message"],
        "example": "timer: seconds=60, message='Time up!'",
    },
    "calculator": {
        "name": "calculator", "description": "ကုန်ပ显示屏ကိရိယာ (calculations)",
        "params": ["expression"],
        "example": "calculator: expression='2+3*4'",
    },
    "translate": {
        "name": "translate", "description": "ဘာသာစကားပြန်ဆိုခြင်း",
        "params": ["text", "to"],
        "example": "translate: text='Hello', to='myanmar'",
    },
}


# ════════════════════════════════════════════════════════
# Agent Runtime (v2.0 with Live API)
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

        # Initialize API clients
        self.web_search = None
        self.ai_chat = None
        if HAS_API:
            api_config = APIConfig()
            cache = Cache(api_config)
            self.web_search = WebSearch(api_config, cache)
            self.ai_chat = AIChat(api_config, cache)

    def process_message(self, user_message: str) -> str:
        """Process user message and generate response"""
        self.turn_count += 1
        if self.turn_count > self.max_turns:
            return self._cleanup_and_respond()

        self.conversation_history.append({
            "role": "user", "content": user_message,
            "timestamp": time.strftime("%H:%M:%S")
        })

        # Check for tool calls
        tool_result = self._check_tool_call(user_message)
        if tool_result:
            self.conversation_history.append({
                "role": "assistant", "content": tool_result,
                "timestamp": time.strftime("%H:%M:%S")
            })
            return tool_result

        # Check for search intent (auto web search)
        search_result = self._check_search_intent(user_message)
        if search_result:
            self.conversation_history.append({
                "role": "assistant", "content": search_result,
                "timestamp": time.strftime("%H:%M:%S")
            })
            return search_result

        # Try AI chat first (if configured)
        ai_result = self._try_ai_chat(user_message)
        if ai_result:
            self.conversation_history.append({
                "role": "assistant", "content": ai_result,
                "timestamp": time.strftime("%H:%M:%S")
            })
            return ai_result

        # Fallback to pattern-based response
        response = self._generate_response(user_message)
        self.conversation_history.append({
            "role": "assistant", "content": response,
            "timestamp": time.strftime("%H:%M:%S")
        })
        return response

    def _try_ai_chat(self, message: str) -> Optional[str]:
        """Try to get response from AI API"""
        if not self.ai_chat or not self.ai_chat.is_configured():
            return None

        personality = self.agent.config.get("personality", "")
        if not personality:
            personality = "You are a helpful AI assistant. Respond in Myanmar language."

        result = self.ai_chat.chat(message, personality)
        if result:
            return result
        return None

    def _check_search_intent(self, message: str) -> Optional[str]:
        """Auto-detect search intent and perform web search"""
        # Search keywords
        search_keywords = [
            "search", "find", "look up", "what is", "who is", "when was",
            "where is", "how to", "why does", "latest", "news",
            "ရှာ", "ရှာပါ", "ဘာ", "အကြောင်း", "ကျေးဇူး", "သတင်း",
            "google", "ddg",
        ]

        msg_lower = message.lower()
        for kw in search_keywords:
            if kw in msg_lower:
                if self.web_search:
                    return self.web_search.search(message)
                return f"[Web Search] Searching: {message}\n(Note: Install api_client.py for live search)"

        return None

    def _check_tool_call(self, message: str) -> Optional[str]:
        """Check if message contains a tool call pattern"""
        tool_pattern = r'^(\w+):\s*(.+)$'
        match = re.match(tool_pattern, message.strip())
        if not match:
            return None

        tool_name = match.group(1)
        params_str = match.group(2)

        params = {}
        for pair in params_str.split(','):
            pair = pair.strip()
            if '=' in pair:
                k, v = pair.split('=', 1)
                params[k.strip()] = v.strip().strip("'\"")
            else:
                params['query'] = pair.strip().strip("'\"")

        return self._execute_tool(tool_name, params)

    def _execute_tool(self, tool_name: str, params: dict) -> str:
        """Execute a tool by name"""
        if tool_name in BUILTIN_TOOLS:
            return self._run_builtin_tool(tool_name, params)

        for tool in self.agent.tools:
            if tool.get("name") == tool_name and tool.get("type") == "custom":
                return self._run_custom_tool(tool, params)

        return f"[Tool not found: {tool_name}]\nAvailable tools: {', '.join(self._list_tools())}"

    def _run_builtin_tool(self, name: str, params: dict) -> str:
        """Run a built-in tool"""
        try:
            if name == "shell_command":
                cmd = params.get("command", "echo hello")
                r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
                return f"[Shell] $ {cmd}\n{(r.stdout or r.stderr or '(no output)').strip()[:500]}"

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
                        return f"[File: {path}]\n{f.read()[:2000]}"
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
                if self.web_search:
                    return self.web_search.search(query)
                return f"[Web Search] Searching: {query}\n(Install api_client for live search)"

            elif name == "ai_chat":
                message = params.get("message", "")
                if self.ai_chat and self.ai_chat.is_configured():
                    result = self.ai_chat.chat(message)
                    return f"[AI] {result}" if result else "[AI] No response"
                return "[AI Chat] Not configured. Run:\n  python3 api_client.py configure --provider openai --key YOUR_KEY\n  python3 api_client.py configure --provider ollama --url http://localhost:11434/api/chat"

            elif name == "http_request":
                url = params.get("url", "")
                method = params.get("method", "GET").upper()
                req = urllib.request.Request(url, method=method)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = resp.read().decode('utf-8', errors='replace')[:1000]
                return f"[HTTP {method} {url}]\n{data}"

            elif name == "calculator":
                expr = params.get("expression", "")
                try:
                    # Safe eval - only math operations
                    allowed = set("0123456789+-*/().^% ")
                    if all(c in allowed for c in expr):
                        expr = expr.replace('^', '**')
                        result = eval(expr)
                        return f"[Calculator] {params.get('expression')} = {result}"
                    return "[Calculator] Invalid expression"
                except Exception as e:
                    return f"[Calculator Error] {e}"

            elif name == "translate":
                text = params.get("text", "")
                to_lang = params.get("to", "myanmar")
                # Simple translation detection via web
                if self.web_search:
                    return self.web_search.search(f"translate {text} to {to_lang}")
                return f"[Translate] {text} -> {to_lang}\n(Install api_client for translation)"

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
            r = subprocess.run(
                [sys.executable, script] + [f"{k}={v}" for k, v in params.items()],
                capture_output=True, text=True, timeout=30
            )
            return r.stdout or r.stderr or "Tool executed"
        return f"[Custom Tool: {tool.get('name')}] No script configured"

    def _generate_response(self, message: str) -> str:
        """Generate a response (fallback when AI is not configured)"""
        personality = self.agent.config.get("personality", "")
        lang = self.agent.config.get("language", "myanmar")

        greetings = ["hello", "hi", "hey", "မင်္ဂလာပါ", "ဟဲ့လို", "ဘာလိုပါ"]
        if any(g in message.lower() for g in greetings):
            return self.agent.config.get("greeting", f"မင်္ဂလာပါ! ကျွန်တော် {self.agent.name} ဖြစ်ပါတယ်။ ဘာကူညီပေးရမလဲ?")

        farewells = ["bye", "exit", "quit", "ကျေးဇူးပါ", "ဆက်ပါ"]
        if any(f in message.lower() for f in farewells):
            return self.agent.config.get("farewell", "ကျေးဇူးပါ! နောက်ထပ် တိုင်းကျွန်းစွာ!")

        if "help" in message.lower() or "ကူညီ" in message:
            return self._generate_help()

        if "tools" in message.lower():
            return self._generate_tools_list()

        if "status" in message.lower() or "config" in message.lower():
            return self._generate_api_status()

        # Default
        if lang == "myanmar":
            hint = ""
            if not self.ai_chat or not self.ai_chat.is_configured():
                hint = "\n\n💡 AI Chat ကို အသုံးပြုဖို့:\n   python3 api_client.py configure --provider openai --key YOUR_KEY\n   python3 api_client.py configure --provider ollama"
            return f"[{self.agent.name}] \"{message}\" ဆိုတဲ့ မေးခွန်းနဲ့ပတ်ဝန်းကျင်းဖြစ်ပါတယ်။\n{hint}\n\n" + self._generate_help()
        else:
            hint = ""
            if not self.ai_chat or not self.ai_chat.is_configured():
                hint = "\n\n💡 To enable AI Chat:\n   python3 api_client.py configure --provider openai --key YOUR_KEY\n   python3 api_client.py configure --provider ollama"
            return f"[{self.agent.name}] I understand: \"{message}\"{hint}\n\n" + self._generate_help()

    def _generate_api_status(self) -> str:
        """Generate API configuration status"""
        status = "📊 API Status\n" + "─" * 40 + "\n"
        if self.ai_chat:
            status += self.ai_chat.get_config_status()
        else:
            status += "  API Client: Not installed\n"
            status += "  (api_client.py not found)"
        status += "\n\n🔍 Web Search: "
        status += "Available" if self.web_search else "Not installed"
        return status

    def _generate_help(self) -> str:
        tools = self._list_tools()
        help_text = f"📋 {self.agent.name} Help\n"
        help_text += "─" * 40 + "\n"
        help_text += "Commands:\n"
        help_text += "  help      Show this help\n"
        help_text += "  tools     List available tools\n"
        help_text += "  status    API configuration status\n"
        help_text += "  info      Agent information\n"
        help_text += "  history   Conversation history\n"
        help_text += "  clear     Clear conversation\n"
        help_text += "  exit      Close agent\n\n"
        help_text += "Live Features:\n"
        help_text += "  • Type any question for AI Chat\n"
        help_text += "  • Include 'search' or 'ရှာ' for Web Search\n"
        help_text += "  • tool_name: param=value for direct tools\n\n"
        help_text += f"Tools ({len(tools)}):\n"
        for t in tools:
            help_text += f"  • {t}\n"
        return help_text

    def _generate_tools_list(self) -> str:
        tools_text = f"🔧 Tools ({len(self._list_tools())})\n" + "─" * 40 + "\n"
        for name, info in BUILTIN_TOOLS.items():
            active = any(t.get("name") == name for t in self.agent.tools)
            status = "✅" if active else "⬜"
            live = " 🌐 LIVE" if info.get("live") else ""
            tools_text += f"  {status} {name:<20} {info['description']}{live}\n"
            tools_text += f"     Example: {info['example']}\n"
        return tools_text

    def _list_tools(self) -> List[str]:
        names = []
        for t in self.agent.tools:
            if t.get("enabled", True):
                names.append(t.get("name", ""))
        return [n for n in names if n]

    def _cleanup_and_respond(self) -> str:
        return self.agent.config.get("farewell", "Session ended.")

    def show_info(self):
        cfg = self.agent.config
        info = f"\n🤖 Agent: {cfg.get('name', 'Unknown')}\n" + "═" * 45 + "\n"
        info += f"  Version:     {cfg.get('version', '?')}\n"
        info += f"  Author:      {cfg.get('author', '?')}\n"
        info += f"  Description: {cfg.get('description', '?')}\n"
        info += f"  Language:    {cfg.get('language', 'myanmar')}\n"
        info += f"  Tools:       {len(self.agent.tools)}\n"
        info += f"  Workflows:   {len(self.agent.workflows)}\n"
        info += f"  Turns:       {self.turn_count}/{self.max_turns}\n"
        ai_status = "Configured" if (self.ai_chat and self.ai_chat.is_configured()) else "Not configured"
        info += f"  AI Chat:     {ai_status}\n"
        info += f"  Web Search:  {'Available' if self.web_search else 'N/A'}\n"
        info += "═" * 45 + "\n"
        return info

    def show_history(self):
        if not self.conversation_history:
            return "[INFO] No conversation history"
        lines = []
        for entry in self.conversation_history:
            role = "👤" if entry["role"] == "user" else "🤖"
            time_str = entry.get("timestamp", "")
            content = entry["content"][:100]
            lines.append(f"  {role} [{time_str}] {content}")
        return "📜 Conversation History\n" + "─" * 45 + "\n" + "\n".join(lines)

    def clear_history(self):
        self.conversation_history = []
        if self.ai_chat:
            self.ai_chat.clear_history()
        return "[OK] Conversation history cleared"


# ════════════════════════════════════════════════════════
# Agent Builder (Low-Code)
# ════════════════════════════════════════════════════════

class AgentBuilder:
    """Low-code agent builder with templates"""

    TEMPLATES = {
        "assistant": {
            "name": "My Assistant", "version": "2.0.0",
            "description": "General purpose AI assistant with live search and chat",
            "author": "Myanos User",
            "personality": "You are a helpful AI assistant named {name}. Always respond in Myanmar language. Be friendly and informative.",
            "language": "myanmar",
            "greeting": "မင်္ဂလာပါ! ကျွန်တော်နောက်လိုက်နေပါတယ်။ ဘာကူညီပေးရမလဲ? (AI Chat + Web Search enabled)",
            "farewell": "ကျေးဇူးပါ! နောက်ထပ် တိုင်းဆက်ပေးပါ။",
            "tools": ["web_search", "ai_chat", "shell_command", "file_read", "file_write", "python_exec", "calculator"],
            "workflows": [],
            "memory": {"enabled": True, "max_turns": 100},
            "safety": {"max_retries": 3, "timeout": 30},
        },
        "coder": {
            "name": "Code Agent", "version": "2.0.0",
            "description": "Programming assistant with code execution and AI",
            "author": "Myanos User",
            "personality": "You are a coding expert. Write clean code. Explain in Myanmar.",
            "language": "myanmar",
            "greeting": "🧑‍💻 Code Agent စတင်ပါပြီ! ဘာ code ရေးပေးရမလဲ?",
            "farewell": "Goodbye! Happy coding! 🚀",
            "tools": ["python_exec", "shell_command", "file_write", "file_read", "ai_chat", "web_search"],
            "workflows": [],
            "memory": {"enabled": True, "max_turns": 50},
            "safety": {"max_retries": 3, "timeout": 60},
        },
        "researcher": {
            "name": "Research Agent", "version": "2.0.0",
            "description": "Web research agent with live search and summarization",
            "author": "Myanos User",
            "personality": "You are a research assistant. Find and summarize information in Myanmar.",
            "language": "myanmar",
            "greeting": "🔍 Research Agent ပြီး! ဘာအကြောင်းရှာစေးချင်ပါသလဲ?",
            "farewell": "ကျေးဇူးပါ!",
            "tools": ["web_search", "ai_chat", "http_request", "file_write", "translate"],
            "workflows": [],
            "memory": {"enabled": True, "max_turns": 100},
            "safety": {"max_retries": 3, "timeout": 30},
        },
        "monitor": {
            "name": "System Monitor Agent", "version": "1.0.0",
            "description": "Monitors system health and alerts on issues",
            "author": "Myanos User",
            "personality": "You are a system monitoring agent. Report concisely.",
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
        "myanmar_teacher": {
            "name": "Myanmar Teacher", "version": "2.0.0",
            "description": "Myanmar language teacher and translator",
            "author": "Myanos User",
            "personality": "You are a Myanmar language teacher. Teach Myanmar language, explain grammar, and translate between Myanmar and English.",
            "language": "myanmar",
            "greeting": "📚 မြန်မာစကားဆရာ မင်္ဂလာပါ! ဘာသာစကားရေးသားတာ ကူညီပေးပါမယ်။",
            "farewell": "ကျေးဇူးပါ! လောကကြီးပါ!",
            "tools": ["web_search", "ai_chat", "translate"],
            "workflows": [],
            "memory": {"enabled": True, "max_turns": 100},
            "safety": {"max_retries": 3, "timeout": 30},
        },
    }

    def create(self, name: str, template: str = "assistant", **kwargs) -> AgentDefinition:
        if template not in self.TEMPLATES:
            raise ValueError(f"Unknown template: {template}. Available: {list(self.TEMPLATES.keys())}")
        config = dict(self.TEMPLATES[template])
        config["name"] = name
        config.update(kwargs)
        return AgentDefinition(config)

    def create_custom(self, name: str, personality: str, tools: list = None, **kwargs) -> AgentDefinition:
        config = {
            "name": name, "version": kwargs.get("version", "2.0.0"),
            "description": kwargs.get("description", f"Custom agent: {name}"),
            "author": kwargs.get("author", "Myanos User"),
            "personality": personality, "language": kwargs.get("language", "myanmar"),
            "greeting": kwargs.get("greeting", f"မင်္ဂလာပါ! ကျွန်တော် {name} ဖြစ်ပါတယ်။"),
            "farewell": kwargs.get("farewell", "ကျေးဇူးပါ!"),
            "tools": tools or ["web_search", "ai_chat", "shell_command"],
            "workflows": [], "memory": {"enabled": True, "max_turns": 50},
            "safety": {"max_retries": 3, "timeout": 30},
        }
        return AgentDefinition(config)

    def save(self, agent: AgentDefinition, path: str = None):
        if path is None:
            AGENTS_DIR.mkdir(exist_ok=True)
            path = str(AGENTS_DIR / f"{agent.name.lower().replace(' ', '-')}.json")
        with open(path, 'w') as f:
            json.dump(agent.config, f, indent=2, ensure_ascii=False)
        return path

    def load(self, path: str) -> AgentDefinition:
        with open(path) as f:
            return AgentDefinition(json.load(f))

    def list_agents(self):
        if not AGENTS_DIR.exists():
            return []
        agents = []
        for f in sorted(AGENTS_DIR.glob("*.json")):
            try:
                with open(f) as fp:
                    cfg = json.load(fp)
                agents.append({"name": cfg.get("name", f.stem), "version": cfg.get("version", "?"),
                    "description": cfg.get("description", ""), "file": str(f)})
            except: pass
        return agents

    def list_templates(self):
        return {name: {"description": t["description"], "tools": t["tools"]} for name, t in self.TEMPLATES.items()}


# ════════════════════════════════════════════════════════
# Interactive CLI
# ════════════════════════════════════════════════════════

def run_interactive(agent: AgentDefinition):
    runtime = AgentRuntime(agent)
    print(f"\n🤖 {agent.name} v{agent.version}")
    print(f"   {agent.config.get('description', '')}")
    print(f"   Type 'help' for commands, 'exit' to quit\n")

    greeting = agent.config.get("greeting", "")
    if greeting:
        print(f"🤖 {greeting}\n")

    while True:
        try:
            user_input = input("You > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit"):
                print(f"🤖 {agent.config.get('farewell', 'Goodbye!')}")
                break
            elif user_input == "help":
                print(runtime._generate_help())
            elif user_input == "tools":
                print(runtime._generate_tools_list())
            elif user_input == "info":
                print(runtime.show_info())
            elif user_input == "history":
                print(runtime.show_history())
            elif user_input == "clear":
                print(runtime.clear_history())
            elif user_input == "status":
                print(runtime._generate_api_status())
            else:
                response = runtime.process_message(user_input)
                print(f"\n🤖 {response}\n")
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except EOFError:
            break


# ════════════════════════════════════════════════════════
# REST API Server (for Desktop integration)
# ════════════════════════════════════════════════════════

class MyanAiHandler(BaseHTTPRequestHandler):
    """HTTP handler for MyanAi REST API"""

    runtime: AgentRuntime = None

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == "/api/status":
            ai_ok = self.runtime.ai_chat and self.runtime.ai_chat.is_configured()
            self._send_json({
                "agent": self.runtime.agent.name,
                "version": VERSION,
                "ai_configured": ai_ok,
                "web_search": self.runtime.web_search is not None,
                "turns": self.runtime.turn_count,
            })
        elif parsed.path == "/api/tools":
            tools = []
            for name, info in BUILTIN_TOOLS.items():
                tools.append({"name": name, "description": info["description"], "live": info.get("live", False)})
            self._send_json({"tools": tools})
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        from urllib.parse import urlparse
        body = self._read_body()

        if urlparse(self.path).path == "/api/chat":
            message = body.get("message", "")
            if not message:
                self._send_json({"error": "Message required"}, 400)
                return
            response = self.runtime.process_message(message)
            self._send_json({"response": response})
        elif urlparse(self.path).path == "/api/search":
            query = body.get("query", "")
            if not query:
                self._send_json({"error": "Query required"}, 400)
                return
            if self.runtime.web_search:
                result = self.runtime.web_search.search(query)
                self._send_json({"results": result})
            else:
                self._send_json({"error": "Web search not available"}, 503)
        elif urlparse(self.path).path == "/api/configure":
            provider = body.get("provider", "")
            api_key = body.get("api_key", "")
            api_url = body.get("api_url", "")
            model = body.get("model", "")
            if self.runtime.ai_chat:
                self.runtime.ai_chat.configure(provider, api_key, api_url, model)
                self._send_json({"status": "ok", "config": self.runtime.ai_chat.get_config_status()})
            else:
                self._send_json({"error": "API client not available"}, 503)
        else:
            self._send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        pass  # Suppress default logging


# ════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="MyanAi — AI Agent Builder v2.0.0")
    sub = parser.add_subparsers(dest="command")

    # Create
    create_p = sub.add_parser("create", help="Create a new agent")
    create_p.add_argument("--name", required=True)
    create_p.add_argument("--template", default="assistant")
    create_p.add_argument("--personality", help="Custom personality")
    create_p.add_argument("--tools", nargs="+")
    create_p.add_argument("--language", default="myanmar")
    create_p.add_argument("--save", action="store_true")

    # Run
    run_p = sub.add_parser("run", help="Run an agent")
    run_p.add_argument("--file", help="Agent config file")
    run_p.add_argument("--template", default="assistant")
    run_p.add_argument("--name", help="Agent name")
    run_p.add_argument("--server", action="store_true", help="Start REST API server")
    run_p.add_argument("--port", type=int, default=8081)

    # List
    sub.add_parser("list", help="List saved agents")
    sub.add_parser("templates", help="List templates")
    sub.add_parser("info", help="Show info")

    # Configure
    conf_p = sub.add_parser("configure", help="Configure API")
    conf_p.add_argument("--provider", choices=["openai", "ollama", "custom"])
    conf_p.add_argument("--key", default="")
    conf_p.add_argument("--url", default="")
    conf_p.add_argument("--model", default="")

    # Search
    search_p = sub.add_parser("search", help="Web search")
    search_p.add_argument("query")

    args = parser.parse_args()
    builder = AgentBuilder()

    if args.command == "create":
        if args.personality:
            agent = builder.create_custom(args.name, args.personality, args.tools, language=args.language)
        else:
            agent = builder.create(args.name, args.template, language=args.language)
        print(f"[OK] Agent created: {agent.name} v{agent.version}")
        print(f"     Tools: {len(agent.tools)}")
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
                print(f"[ERR] Agent not found: {args.name}"); return
        else:
            agent = builder.create(name="Quick Agent", template=args.template)

        if args.server:
            # Start REST API server
            runtime = AgentRuntime(agent)
            MyanAiHandler.runtime = runtime
            server = HTTPServer(("0.0.0.0", args.port), MyanAiHandler)
            print(f"🤖 MyanAi Server running on http://localhost:{args.port}")
            print(f"   Agent: {agent.name}")
            print(f"   Endpoints: POST /api/chat, POST /api/search, GET /api/status")
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                print("\nServer stopped")
        else:
            run_interactive(agent)

    elif args.command == "list":
        agents = builder.list_agents()
        if not agents:
            print("[INFO] No saved agents")
        else:
            print(f"🤖 Saved Agents ({len(agents)}):\n")
            for a in agents:
                print(f"  • {a['name']} v{a['version']}\n    {a['description']}\n")

    elif args.command == "templates":
        templates = builder.list_templates()
        print(f"📋 Templates ({len(templates)}):\n")
        for name, info in templates.items():
            print(f"  [{name}]\n    {info['description']}\n    Tools: {', '.join(info['tools'])}\n")

    elif args.command == "configure":
        if HAS_API:
            config = APIConfig()
            cache = Cache(config)
            ai = AIChat(config, cache)
            ai.configure(args.provider, args.key, args.url, args.model)
            print("[OK] API configured:")
            print(ai.get_config_status())
        else:
            print("[ERR] api_client.py not found")

    elif args.command == "info":
        print(f"\n🤖 MyanAi v{VERSION}")
        print("═" * 45)
        print(f"  Low-Code AI Agent Builder for Myanos OS")
        print(f"  Built-in Tools: {len(BUILTIN_TOOLS)} (web_search, ai_chat, calculator...)")
        print(f"  Templates: {len(builder.TEMPLATES)}")
        print(f"  API Client: {'Installed' if HAS_API else 'Not found'}")
        print("═" * 45)
        print("\nCommands:")
        print("  myanai create --name 'Agent'")
        print("  myanai run --template coder")
        print("  myanai run --server --port 8081")
        print("  myanai configure --provider ollama")
        print("  myanai search 'Myanmar history'")

    elif args.command == "search":
        if HAS_API:
            config = APIConfig()
            cache = Cache(config)
            search = WebSearch(config, cache)
            print(search.search(args.query))
        else:
            print("[ERR] api_client.py not found")

    else:
        parser.print_help()

if __name__ == "__main__":
    main()
