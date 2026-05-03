using System.Text.Json;
using Roblox.Dto.Avatar;
using Roblox.Dto.AvatarCache;

namespace Roblox.Services;

public class AvatarCache : ServiceBase, IService
{
    private string GetRenderStatusKey(long userId)
    {
        return "AvatarCache:v1:RenderStatus:" + userId;
    }

    private string GetPendingAssetsKey(long userId)
    {
        return "AvatarCache:v1:PendingAssets:" + userId;
    }
    
    public async Task<IEnumerable<long>?> GetPendingAssets(long userId)
    {
        var key = GetPendingAssetsKey(userId);
        var result = await Cache.distributed.StringGetAsync(key);
        if (result == null) return null;
        return JsonSerializer.Deserialize<AvatarCacheAsset>(result)?.assetIds;
    }

    public async Task SetPendingAssets(long userId, IEnumerable<long> assetIds)
    {
        await Cache.distributed.StringSetAsync(GetPendingAssetsKey(userId),
            JsonSerializer.Serialize(new AvatarCacheAsset(assetIds.Distinct())), TimeSpan.FromMinutes(1));
    }

    private string GetPendingColorsKey(long userId)
    {
        return "AvatarCache:v1:PendingColors:" + userId;
    }

    public async Task<ColorEntry?> GetColors(long userId)
    {
        var key = GetPendingColorsKey(userId);
        var result = await Cache.distributed.StringGetAsync(key);
        if (result == null) return null;
        return JsonSerializer.Deserialize<ColorEntry>(result);
    }
    
    public async Task SetColors(long userId, ColorEntry colors)
    {
        await Cache.distributed.StringSetAsync(GetPendingColorsKey(userId),
            JsonSerializer.Serialize(colors), TimeSpan.FromMinutes(1));
    }

    public async Task<bool> AttemptScheduleRenderAsync(long userId)
    {
        var key = GetRenderStatusKey(userId);
        var existing = await Cache.distributed.StringGetAsync(key);
        if (existing != null)
            return false;
        await Cache.distributed.StringSetAsync(key, "rendering", TimeSpan.FromMinutes(5));
        return true;
    }

    public async Task UnscheduleRenderAsync(long userId)
    {
        var key = GetRenderStatusKey(userId);
        await Cache.distributed.KeyDeleteAsync(key);
    }

    public async Task<bool> IsRenderScheduledAsync(long userId)
    {
        var key = GetRenderStatusKey(userId);
        var result = await Cache.distributed.StringGetAsync(key);
        return result != null;
    }

    // Synchronous wrappers for backward compatibility
    public bool AttemptScheduleRender(long userId)
    {
        return AttemptScheduleRenderAsync(userId).Result;
    }

    public void UnscheduleRender(long userId)
    {
        UnscheduleRenderAsync(userId).Wait();
    }

    public bool IsRenderScheduled(long userId)
    {
        return IsRenderScheduledAsync(userId).Result;
    }
    
    public bool IsThreadSafe()
    {
        return true;
    }

    public bool IsReusable()
    {
        return true;
    }
}