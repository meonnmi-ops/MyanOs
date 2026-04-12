#!/usr/bin/env python3
"""
MyanAi API Client v1.0.0
Live Web Search + AI Chat API integration for MyanAi

Supports:
  - DuckDuckGo web search (no API key needed)
  - OpenAI-compatible chat completions (configurable endpoint)
  - Google search (via serpapi style)
  - Response caching

Author: Meonnmi-ops (CTO, Myanos Project)
"""

import os
import sys
import json
import time
import hashlib
import urllib.request
import urllib.parse
import urllib.error
import re
from pathlib import Path
from typing import Optional, Dict, List

CACHE_DIR = Path(__file__).parent / ".cache"
CONFIG_FILE = Path(__file__).parent / "api_config.json"

# Default API configuration
DEFAULT_CONFIG = {
    "ai_provider": "openai",         # "openai", "ollama", "custom"
    "ai_api_key": "",
    "ai_api_url": "https://api.openai.com/v1/chat/completions",
    "ai_model": "gpt-3.5-turbo",
    "ai_max_tokens": 1024,
    "ai_temperature": 0.7,
    "search_engine": "duckduckgo",   # "duckduckgo", "google"
    "search_results": 5,
    "cache_enabled": True,
    "cache_ttl": 3600,               # 1 hour
}


class Config:
    """API configuration manager"""

    def __init__(self):
        self.data = self._load()

    def _load(self) -> dict:
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                return {**DEFAULT_CONFIG, **saved}
            except (json.JSONDecodeError, IOError):
                pass
        return dict(DEFAULT_CONFIG)

    def save(self):
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def get(self, key: str, default=None):
        return self.data.get(key, default)

    def set(self, key: str, value):
        self.data[key] = value
        self.save()

    def is_ai_configured(self) -> bool:
        """Check if AI API is properly configured"""
        provider = self.get("ai_provider", "")
        if provider == "ollama":
            return bool(self.get("ai_api_url", ""))
        return bool(self.get("ai_api_key", "") or self.get("ai_api_url", ""))


class Cache:
    """Simple file-based response cache"""

    def __init__(self, config: Config):
        self.enabled = config.get("cache_enabled", True)
        self.ttl = config.get("cache_ttl", 3600)
        CACHE_DIR.mkdir(exist_ok=True)

    def _key(self, query: str) -> str:
        return hashlib.sha256(query.encode()).hexdigest()[:16]

    def get(self, query: str) -> Optional[str]:
        if not self.enabled:
            return None
        cache_file = CACHE_DIR / f"search_{self._key(query)}.json"
        if not cache_file.exists():
            return None
        try:
            with open(cache_file, 'r') as f:
                entry = json.load(f)
            if time.time() - entry.get("time", 0) > self.ttl:
                cache_file.unlink()
                return None
            return entry.get("data")
        except (json.JSONDecodeError, IOError):
            return None

    def put(self, query: str, data: str):
        if not self.enabled:
            return
        cache_file = CACHE_DIR / f"search_{self._key(query)}.json"
        try:
            with open(cache_file, 'w') as f:
                json.dump({"time": time.time(), "data": data}, f)
        except IOError:
            pass


class WebSearch:
    """Live web search using DuckDuckGo"""

    def __init__(self, config: Config, cache: Cache):
        self.config = config
        self.cache = cache
        self.engine = config.get("search_engine", "duckduckgo")
        self.max_results = config.get("search_results", 5)

    def search(self, query: str) -> str:
        """Perform web search and return formatted results"""
        if self.engine == "duckduckgo":
            return self._duckduckgo_search(query)
        return f"[Search engine '{self.engine}' not yet supported. Use 'duckduckgo'.]"

    def _duckduckgo_search(self, query: str) -> str:
        """Search using DuckDuckGo lite HTML"""
        # Check cache
        cached = self.cache.get(f"ddg:{query}")
        if cached:
            return cached

        try:
            params = urllib.parse.urlencode({
                "q": query,
                "kl": "my-mm",  # Myanmar region
            })
            url = f"https://lite.duckduckgo.com/lite/?{params}"
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
                "Accept-Language": "my-MM,en;q=0.9",
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read().decode('utf-8', errors='replace')

            results = self._parse_ddg_html(html, query)
            if not results:
                # Try alternative DuckDuckGo API
                results = self._ddg_api_search(query)

            output = self._format_results(results, query)
            self.cache.put(f"ddg:{query}", output)
            return output

        except urllib.error.URLError as e:
            return f"[Web Search Error] Cannot connect to search engine: {e.reason}"
        except Exception as e:
            return f"[Web Search Error] {e}"

    def _ddg_api_search(self, query: str) -> List[dict]:
        """Alternative DuckDuckGo instant answer API"""
        results = []
        try:
            params = urllib.parse.urlencode({"q": query, "format": "json", "no_redirect": "1"})
            url = f"https://api.duckduckgo.com/?{params}"
            req = urllib.request.Request(url, headers={
                "User-Agent": "MyanosMyanAi/2.0",
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())

            abstract = data.get("Abstract", "")
            abstract_url = data.get("AbstractURL", "")
            heading = data.get("Heading", "")

            if abstract:
                results.append({
                    "title": heading or query,
                    "url": abstract_url or "",
                    "snippet": abstract[:300],
                    "source": "DuckDuckGo",
                })

            # Related topics
            for topic in data.get("RelatedTopics", [])[:3]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append({
                        "title": topic.get("Text", "")[:80],
                        "url": topic.get("FirstURL", ""),
                        "snippet": topic.get("Text", "")[:200],
                        "source": "DuckDuckGo",
                    })
        except Exception:
            pass
        return results

    def _parse_ddg_html(self, html: str, query: str) -> List[dict]:
        """Parse DuckDuckGo lite HTML results"""
        results = []
        # Extract result links and snippets from lite HTML
        # Pattern: <a class="result-link" href="URL">TITLE</a>
        link_pattern = re.compile(r'<a[^>]+class="result-link"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.DOTALL)
        snippet_pattern = re.compile(r'<td[^>]+class="result-snippet"[^>]*>(.*?)</td>', re.DOTALL)

        links = link_pattern.findall(html)
        snippets = snippet_pattern.findall(html)

        for i, (url, title) in enumerate(links[:self.max_results]):
            # Clean HTML tags
            title = re.sub(r'<[^>]+>', '', title).strip()
            snippet = ""
            if i < len(snippets):
                snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
            if title and url:
                results.append({
                    "title": title,
                    "url": url,
                    "snippet": snippet[:300],
                    "source": "DuckDuckGo",
                })

        return results

    def _format_results(self, results: List[dict], query: str) -> str:
        """Format search results as readable text"""
        if not results:
            return f"[Web Search] No results found for: {query}"

        output = f"🔍 Web Search: \"{query}\"\n"
        output += "─" * 50 + "\n\n"

        for i, r in enumerate(results[:self.max_results], 1):
            title = r.get("title", "Untitled")
            url = r.get("url", "")
            snippet = r.get("snippet", "")
            source = r.get("source", "")

            output += f"  {i}. {title}\n"
            if url:
                output += f"     🔗 {url}\n"
            if snippet:
                # Truncate snippet
                if len(snippet) > 200:
                    snippet = snippet[:200] + "..."
                output += f"     {snippet}\n"
            output += "\n"

        output += f"  Total: {len(results)} results (showing {min(len(results), self.max_results)})"
        return output


class AIChat:
    """AI Chat client - OpenAI-compatible API"""

    def __init__(self, config: Config, cache: Cache):
        self.config = config
        self.cache = cache
        self.provider = config.get("ai_provider", "openai")
        self.api_url = config.get("ai_api_url", "")
        self.api_key = config.get("ai_api_key", "")
        self.model = config.get("ai_model", "gpt-3.5-turbo")
        self.max_tokens = config.get("ai_max_tokens", 1024)
        self.temperature = config.get("ai_temperature", 0.7)
        self.conversation = []  # Message history

    def chat(self, user_message: str, system_prompt: str = "") -> str:
        """Send a chat message and get AI response"""
        if not self.config.is_ai_configured():
            return None  # Not configured - caller should use fallback

        # Build messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.extend(self.conversation)
        messages.append({"role": "user", "content": user_message})

        try:
            payload = json.dumps({
                "model": self.model,
                "messages": messages,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
            }).encode()

            headers = {
                "Content-Type": "application/json",
                "User-Agent": "MyanosMyanAi/2.0",
            }

            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"

            # For Ollama, no auth needed
            if self.provider == "ollama":
                headers.pop("Authorization", None)

            req = urllib.request.Request(self.api_url, data=payload, headers=headers, method="POST")

            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode())

            # Parse response
            choices = data.get("choices", [])
            if choices:
                content = choices[0].get("message", {}).get("content", "")
                # Add to conversation history
                self.conversation.append({"role": "user", "content": user_message})
                self.conversation.append({"role": "assistant", "content": content})
                # Keep history manageable
                if len(self.conversation) > 20:
                    self.conversation = self.conversation[-20:]
                return content

            return "[AI Error] No response from API"

        except urllib.error.HTTPError as e:
            body = ""
            try:
                body = e.read().decode()
            except:
                pass
            return f"[AI API Error] HTTP {e.code}: {e.reason}\n{body[:200]}"
        except urllib.error.URLError as e:
            return f"[AI API Error] Connection failed: {e.reason}\nMake sure the API endpoint is accessible."
        except Exception as e:
            return f"[AI Error] {e}"

    def clear_history(self):
        """Clear conversation history"""
        self.conversation = []

    def is_configured(self) -> bool:
        """Check if AI is properly configured"""
        return self.config.is_ai_configured()

    def get_config_status(self) -> str:
        """Get configuration status info"""
        provider = self.provider
        url = self.api_url or "Not set"
        model = self.model
        key_set = "Yes" if self.api_key else "No"

        status = f"AI Provider: {provider}\n"
        status += f"API URL:     {url}\n"
        status += f"Model:       {model}\n"
        status += f"API Key:     {key_set}\n"
        status += f"Max Tokens:  {self.max_tokens}\n"
        status += f"Temperature: {self.temperature}"
        return status

    def configure(self, provider: str, api_key: str = "", api_url: str = "", model: str = ""):
        """Configure AI settings"""
        if provider:
            self.config.set("ai_provider", provider)
        if api_key:
            self.config.set("ai_api_key", api_key)
        if api_url:
            self.config.set("ai_api_url", api_url)
        if model:
            self.config.set("ai_model", model)

        # Update instance
        self.provider = self.config.get("ai_provider", provider)
        self.api_key = self.config.get("ai_api_key", api_key)
        self.api_url = self.config.get("ai_api_url", api_url)
        self.model = self.config.get("ai_model", model)

        # Set default URLs for known providers
        if self.provider == "openai" and not self.api_url:
            self.api_url = "https://api.openai.com/v1/chat/completions"
            self.config.set("ai_api_url", self.api_url)
        elif self.provider == "ollama" and not self.api_url:
            self.api_url = "http://localhost:11434/api/chat"
            self.config.set("ai_api_url", self.api_url)


def test_web_search():
    """Quick test of web search"""
    config = Config()
    cache = Cache(config)
    search = WebSearch(config, cache)
    print("[Testing Web Search...]")
    result = search.search("Myanmar Web OS")
    print(result[:500])


def test_ai_chat():
    """Quick test of AI chat"""
    config = Config()
    cache = Cache(config)
    ai = AIChat(config, cache)

    if not ai.is_configured():
        print("[AI Chat] Not configured. Set API key first:")
        print("  python3 api_client.py configure --key YOUR_KEY")
        print("  python3 api_client.py configure --provider ollama --url http://localhost:11434/api/chat")
        return

    print("[Testing AI Chat...]")
    response = ai.chat("Hello, who are you?")
    print(f"Response: {response[:300]}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="MyanAi API Client")
    sub = parser.add_subparsers(dest="command")

    # Test search
    sub.add_parser("test-search", help="Test web search")

    # Test AI
    sub.add_parser("test-ai", help="Test AI chat")

    # Configure
    conf_p = sub.add_parser("configure", help="Configure API settings")
    conf_p.add_argument("--provider", choices=["openai", "ollama", "custom"], default="")
    conf_p.add_argument("--key", default="", help="API key")
    conf_p.add_argument("--url", default="", help="API URL")
    conf_p.add_argument("--model", default="", help="Model name")

    # Search
    search_p = sub.add_parser("search", help="Search the web")
    search_p.add_argument("query", help="Search query")

    args = parser.parse_args()

    if args.command == "test-search":
        test_web_search()
    elif args.command == "test-ai":
        test_ai_chat()
    elif args.command == "configure":
        config = Config()
        cache = Cache(config)
        ai = AIChat(config, cache)
        ai.configure(args.provider, args.key, args.url, args.model)
        print("[OK] API configured:")
        print(ai.get_config_status())
    elif args.command == "search":
        config = Config()
        cache = Cache(config)
        search = WebSearch(config, cache)
        print(search.search(args.query))
    else:
        parser.print_help()
