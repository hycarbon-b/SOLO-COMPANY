#!/usr/bin/env python3
"""
量化策略注册表 + 动态加载器

所有策略均通过外部 .py 文件动态加载（--strategy-file），
不再内置任何策略实现。策略文件约定见 SKILL.md "自定义策略" 节。
"""

from __future__ import annotations
from typing import Any


# ─── 策略注册表（运行时由 load_strategy_file 填充）────────────────────────────

STRATEGIES: dict[str, Any] = {}

STRATEGY_DESCRIPTIONS: dict[str, str] = {}

STRATEGY_DEFAULT_PARAMS: dict[str, dict] = {}


def get_strategy(name: str) -> Any:
    if name not in STRATEGIES:
        raise ValueError(
            f"未知策略: {name}\n可用策略: {', '.join(STRATEGIES)}"
        )
    return STRATEGIES[name]


def get_strategy_label(name: str, params: dict) -> str:
    tpl = STRATEGY_DESCRIPTIONS.get(name, name)
    merged = {**STRATEGY_DEFAULT_PARAMS.get(name, {}), **params}
    try:
        return tpl.format(**merged)
    except Exception:
        return name


def load_strategy_file(path: "str") -> tuple:
    """
    从指定 Python 文件动态加载并注册自定义策略。

    策略文件约定（详见 SKILL.md "自定义策略" 节）：
      - 必须定义 run(df, **kwargs) 函数，或任意 strategy_<name>(df, **kwargs) 函数
      - 可选：STRATEGY_NAME = "my_strategy"   # 策略标识符（默认使用文件名）
      - 可选：PARAMS = {"period": 10}          # 默认参数字典
      - 可选：DESCRIPTION = "策略说明"         # 人类可读描述

    加载成功后自动注册到全局 STRATEGIES / STRATEGY_DEFAULT_PARAMS / STRATEGY_DESCRIPTIONS。
    返回 (strategy_name, strategy_fn, default_params, description)
    """
    import importlib.util
    from pathlib import Path as _Path

    fpath = _Path(path).resolve()
    if not fpath.exists():
        raise FileNotFoundError(f"策略文件不存在: {fpath}")
    if fpath.suffix != ".py":
        raise ValueError(f"策略文件必须是 .py 文件: {fpath}")

    spec = importlib.util.spec_from_file_location("_custom_strategy", fpath)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        raise ImportError(f"加载策略文件失败: {fpath}\n原因: {e}") from e

    # 确定策略名称
    name: str = getattr(mod, "STRATEGY_NAME", None) or fpath.stem

    # 查找入口函数：优先 run()，其次首个 strategy_*() 函数
    fn = getattr(mod, "run", None)
    if fn is None or not callable(fn):
        candidates = [
            (k, v) for k, v in vars(mod).items()
            if k.startswith("strategy_") and callable(v)
        ]
        if candidates:
            fn_key, fn = candidates[0]
            if not getattr(mod, "STRATEGY_NAME", None):
                name = fn_key.replace("strategy_", "", 1)
        else:
            raise ValueError(
                f"策略文件 {fpath.name} 中未找到有效的策略函数。\n"
                "请定义 `run(df, **kwargs)` 或 `strategy_<name>(df, **kwargs)`"
            )

    default_params: dict = getattr(mod, "PARAMS", {})
    description: str = getattr(mod, "DESCRIPTION", f"自定义策略: {name}")

    # 注册到全局策略表（使回测引擎和报告能正常识别）
    STRATEGIES[name] = fn
    STRATEGY_DEFAULT_PARAMS[name] = default_params
    STRATEGY_DESCRIPTIONS[name] = description

    return name, fn, default_params, description
