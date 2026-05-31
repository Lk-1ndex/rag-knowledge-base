import pytest

from middleware.rate_limiter import check_rate


class FakePipeline:
    def __init__(self, redis):
        self.redis = redis

    def zremrangebyscore(self, key, start, end):
        self.redis.items[key] = [value for value in self.redis.items.get(key, []) if value > end]
        return self

    def zcard(self, key):
        self.count_key = key
        return self

    def zadd(self, key, mapping):
        self.add_key = key
        self.add_values = list(mapping.values())
        return self

    def expire(self, key, seconds):
        return self

    async def execute(self):
        count = len(self.redis.items.get(self.count_key, []))
        self.redis.items.setdefault(self.add_key, []).extend(self.add_values)
        return [0, count, 1, True]


class FakeRedis:
    def __init__(self):
        self.items = {}

    def pipeline(self):
        return FakePipeline(self)


@pytest.mark.asyncio
async def test_check_rate_blocks_after_limit():
    redis = FakeRedis()
    assert await check_rate(redis, "key", limit=1) == (True, 0)
    allowed, retry_after = await check_rate(redis, "key", limit=1)
    assert allowed is False
    assert retry_after > 0
