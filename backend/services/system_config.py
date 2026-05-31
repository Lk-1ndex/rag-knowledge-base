from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.system_config import SystemConfig

DEFAULT_SYSTEM_PROMPT = """你是一个学术研究助手，服务于一个通信与信息系统研究组。
请基于以下从知识库中检索到的内容来回答问题。
如果检索到的内容不足以完整回答问题，请如实说明，不要编造内容。
回答应当准确、专业，中英文均可，引用信息时请注明来源文献标题。

检索到的相关内容：
{context}
"""


DEFAULTS = {
    "system_prompt": DEFAULT_SYSTEM_PROMPT,
    "default_top_k": str(settings.default_top_k),
    "rate_limit_per_minute": str(settings.rate_limit_per_minute),
}


async def get_config_value(db: AsyncSession, key: str) -> str:
    item = await db.get(SystemConfig, key)
    if item is None:
        value = DEFAULTS[key]
        db.add(SystemConfig(key=key, value=value))
        await db.commit()
        return value
    return item.value


async def set_config_value(db: AsyncSession, key: str, value: str) -> None:
    item = await db.get(SystemConfig, key)
    if item is None:
        db.add(SystemConfig(key=key, value=value))
    else:
        item.value = value
    await db.commit()


async def ensure_default_configs(db: AsyncSession) -> None:
    for key, value in DEFAULTS.items():
        exists = (await db.execute(select(SystemConfig).where(SystemConfig.key == key))).scalar_one_or_none()
        if exists is None:
            db.add(SystemConfig(key=key, value=value))
    await db.commit()
