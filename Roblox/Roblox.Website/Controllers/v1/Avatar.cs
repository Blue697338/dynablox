using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Roblox.Dto.Avatar;
using Roblox.Exceptions;
using Roblox.Models.Avatar;
using Roblox.Rendering;
using Roblox.Services;
using Roblox.Services.App.FeatureFlags;
using Roblox.Website.WebsiteModels;
using ServiceProvider = Roblox.Services.ServiceProvider;

namespace Roblox.Website.Controllers;

[ApiController]
[Route("/apisite/avatar/v1")]
public class AvatarControllerV1 : ControllerBase
{
    private void FeatureCheck()
    {
        FeatureFlags.FeatureCheck(FeatureFlag.AvatarsEnabled);
    }
    
    private void AttemptScheduleRender(bool forceRedraw = false)
    {
        var userId = safeUserSession.userId;
        using (var cache = ServiceProvider.GetOrCreate<AvatarCache>())
        {
            var scheduled = cache.AttemptScheduleRender(userId);
            Console.WriteLine("[Avatar] AttemptScheduleRender for userId={0}, scheduled={1}, forceRedraw={2}", userId, scheduled, forceRedraw);
            if (!scheduled) 
            {
                Console.WriteLine("[Avatar] Render already scheduled for userId={0}, skipping", userId);
                return;
            }
        }
        
        
        Task.Run(async () =>
        {
            Console.WriteLine("[Avatar] Background render task starting for userId={0}, waiting 2 seconds...", userId);
            await Task.Delay(TimeSpan.FromSeconds(2));
            
            using var cache = ServiceProvider.GetOrCreate<AvatarCache>();
            try
            {
                Console.WriteLine("[Avatar] Background render task executing for userId={0}", userId);
                using var avatarService = Roblox.Services.ServiceProvider.GetOrCreate<AvatarService>();
                var assetIds = await cache.GetPendingAssets(userId);
                var newColors = await cache.GetColors(userId);
                Console.WriteLine("[Avatar] Got pending assets: {0}, colors: {1}", assetIds?.Count() ?? 0, newColors != null);
                await avatarService.RedrawAvatar(userId, assetIds, newColors, AvatarType.R6, forceRedraw);
                Console.WriteLine("[Avatar] RedrawAvatar completed successfully for userId={0}", userId);
            }
            catch (Exception e)
            {
                Console.WriteLine("[Avatar] Background render failed for userId={0}: {1}\n{2}", userId, e.Message, e.StackTrace);
            }
            finally
            {
                cache.UnscheduleRender(userId);
                Console.WriteLine("[Avatar] Unscheduled render for userId={0}", userId);
            }
        });
    }
    
    [HttpPost("avatar/redraw-thumbnail")]
    public void RequestRedrawAvatar()
    {
        FeatureCheck();
        AttemptScheduleRender(true);
    }

    [HttpGet("avatar/render-status")]
    public async Task<dynamic> GetRenderStatus()
    {
        var userId = safeUserSession.userId;
        using var cache = ServiceProvider.GetOrCreate<AvatarCache>();
        var isScheduled = cache.IsRenderScheduled(userId);
        return new { isRendering = isScheduled };
    }

    [HttpPost("avatar/set-wearing-assets")]
    public async Task SetWornAssets([Required, FromBody] SetWearingAssetsRequest request)
    {
        FeatureCheck();
        
        using var cache = ServiceProvider.GetOrCreate<AvatarCache>();
        await cache.SetPendingAssets(safeUserSession.userId, request.assetIds);
        
        AttemptScheduleRender();
    }

    [HttpPost("avatar/assets/{assetId:long}/wear")]
    public async Task WearAsset([Required] long assetId)
    {
        FeatureCheck();
        var currentlyWorn = (await services.avatar.GetWornAssets(safeUserSession.userId)).ToList();
        if (!currentlyWorn.Contains(assetId))
        {
            currentlyWorn.Add(assetId);
        }

        using var cache = ServiceProvider.GetOrCreate<AvatarCache>();
        await cache.SetPendingAssets(safeUserSession.userId, currentlyWorn);
        
        AttemptScheduleRender();
    }

    [HttpPost("avatar/set-body-colors")]
    public async Task SetBodyColors([Required, FromBody] SetColorsRequest colors)
    {
        FeatureCheck();
        
        // Save colors to database immediately
        using var avatarService = ServiceProvider.GetOrCreate<AvatarService>();
        var currentAssets = await avatarService.GetWornAssets(safeUserSession.userId);
        await avatarService.UpdateUserAvatar(safeUserSession.userId, colors, currentAssets);
        
        // Also save to cache for render
        using var cache = ServiceProvider.GetOrCreate<AvatarCache>();
        await cache.SetColors(safeUserSession.userId, colors);
        
        AttemptScheduleRender();
    }

    [HttpGet("recent-items/{item}/list")]
    public async Task<dynamic> GetRecentItems()
    {
        FeatureCheck();
        var recent = await services.avatar.GetRecentItems(safeUserSession.userId);
        var multiGet = await services.assets.MultiGetInfoById(recent);
        return new
        {
            data = multiGet.Select(c => new
            {
                id = c.id,
                name = c.name,
                type = "Asset",
                assetType = new
                {
                    id = (int) c.assetType,
                    name = c.assetType,
                }
            })
        };
    }

    [HttpGet("users/{userId:long}/outfits")]
    public async Task<dynamic> GetUserOutfits(long userId, int itemsPerPage, int page)
    {
        FeatureCheck();
        var offset = itemsPerPage * page - itemsPerPage;
        var result = (await services.avatar.GetUserOutfits(userId, itemsPerPage, offset)).ToList();
        return new
        {
            filteredCount = 0,
            data = result,
            total = result.Count,
        };
    }

    [HttpPost("outfits/{outfitId:long}/wear")]
    public async Task WearOutfit(long outfitId)
    {
        FeatureCheck();
        var outfitDetails = await services.avatar.GetOutfitById(outfitId);
        await services.avatar.RedrawAvatar(safeUserSession.userId, outfitDetails.assetIds, outfitDetails.details, AvatarType.R6);
    }

    /// <summary>
    /// Create an outfit
    /// </summary>
    /// <remarks>
    /// Unlike Roblox, this method ignores the body parameters - it just uses the outfit of the authenticated user.
    /// </remarks>
    [HttpPost("outfits/create")]
    public async Task CreateOutfit([Required,FromBody] CreateOutfitRequest request)
    {
        FeatureCheck();
        var assets = await services.avatar.GetWornAssets(safeUserSession.userId);
        var existingAvatar = await services.avatar.GetAvatar(safeUserSession.userId);
        await services.avatar.CreateOutfit(safeUserSession.userId, request.name, existingAvatar.thumbnailUrl,
            existingAvatar.headshotUrl, new OutfitExtendedDetails()
            {
                details = new OutfitAvatar()
                {
                    headColorId = existingAvatar.headColorId,
                    torsoColorId = existingAvatar.torsoColorId,
                    leftArmColorId = existingAvatar.leftArmColorId,
                    rightArmColorId = existingAvatar.rightArmColorId,
                    leftLegColorId = existingAvatar.leftLegColorId,
                    rightLegColorId = existingAvatar.rightLegColorId,
                    userId = safeUserSession.userId,
                },
                assetIds = assets,
            });
    }

    [HttpPost("outfits/{outfitId:long}/delete")]
    public async Task DeleteOutfit(long outfitId)
    {
        FeatureCheck();
        var info = await services.avatar.GetOutfitById(outfitId);
        if (info.details.userId != userSession.userId)
            throw new ForbiddenException(0, "Forbidden");
        
        await services.avatar.DeleteOutfit(outfitId);
    }
    
    /// <summary>
    /// Update an outfit
    /// </summary>
    /// <remarks>
    /// Unlike Roblox, this method ignores the body parameters - it just uses the outfit of the authenticated user.
    /// </remarks>
    [HttpPatch("outfits/{outfitId:long}")]
    public async Task UpdateOutfit(long outfitId, [Required,FromBody] UpdateOutfitRequest request)
    {
        FeatureCheck();
        var outfitDetails = await services.avatar.GetOutfitById(outfitId);
        if (outfitDetails.details.userId != safeUserSession.userId)
            throw new ForbiddenException();
        var assets = await services.avatar.GetWornAssets(safeUserSession.userId);
        var existingAvatar = await services.avatar.GetAvatar(safeUserSession.userId);
        await services.avatar.UpdateOutfit(outfitId, request.name, existingAvatar.thumbnailUrl,
            existingAvatar.headshotUrl, new OutfitExtendedDetails()
            {
                details = new OutfitAvatar()
                {
                    headColorId = existingAvatar.headColorId,
                    torsoColorId = existingAvatar.torsoColorId,
                    leftArmColorId = existingAvatar.leftArmColorId,
                    rightArmColorId = existingAvatar.rightArmColorId,
                    leftLegColorId = existingAvatar.leftLegColorId,
                    rightLegColorId = existingAvatar.rightLegColorId,
                    userId = safeUserSession.userId,
                },
                assetIds = assets,
            });
    }

    [HttpGet("users/{userId:long}/avatar")]
    public async Task<dynamic> GetAvatar(long userId)
    {
        var assets = await services.avatar.GetWornAssets(userId);
        var existingAvatar = await services.avatar.GetAvatar(userId);
        var multiGetResults = await services.assets.MultiGetInfoById(assets);

        // Ensure thumbnail URLs have leading slash for consistency
        var thumbnailUrl = existingAvatar.thumbnailUrl;
        var headshotUrl = existingAvatar.headshotUrl;
        
        if (!string.IsNullOrEmpty(thumbnailUrl) && !thumbnailUrl.StartsWith("/"))
        {
            thumbnailUrl = "/" + thumbnailUrl;
        }
        if (!string.IsNullOrEmpty(headshotUrl) && !headshotUrl.StartsWith("/"))
        {
            headshotUrl = "/" + headshotUrl;
        }

        return new
        {
            scales = new
            {
                height = 1,
                width = 1,
                head = 1,
                depth = 1,
                proportion = 1,
                bodyType = 1,
            },
            playerAvatarType = AvatarType.R6,
            bodyColors = (ColorEntry)existingAvatar,
            assets = multiGetResults.Select(c =>
            {
                return new
                {
                    id = c.id,
                    name = c.name,
                    assetType = new
                    {
                        id = (int) c.assetType,
                        name = c.assetType,
                    },
                };
            }),
            thumbnailUrl = thumbnailUrl,
            headshotUrl = headshotUrl,
        };
    }

    [HttpGet("avatar")]
    public async Task<dynamic> GetMyAvatar()
    {
        if (userSession == null)
        {
            // Return default avatar for unauthenticated users
            return await GetAvatar(1); // Default user ID
        }
        return await GetAvatar(userSession.userId);
    }

    [HttpGet("avatar/metadata")]
    public dynamic GetAvatarMetadata()
    {
        return new
        {
            enableDefaultClothingMessage = false,
            isAvatarScaleEmbeddedInTab = true,
            isBodyTypeScaleOutOfTab = true,
            scaleHeightIncrement = 0.05,
            scaleWidthIncrement = 0.05,
            scaleHeadIncrement = 0.05,
            scaleProportionIncrement = 0.05,
            scaleBodyTypeIncrement = 0.05,
            supportProportionAndBodyType = true,
            showDefaultClothingMessageOnPageLoad = false,
            areThreeDeeThumbsEnabled = true,
        };
    }

    [HttpGet("avatar-rules")]
    public dynamic GetAvatarRules()
    {
        return new
        {
            playerAvatarTypes = Enum.GetNames<AvatarType>(),
            scales = new
            {
                height = new
                {
                    min = 0.9,
                    max = 1.05,
                    increment = 0.01,
                },
                width = new
                {
                    min = 0.7,
                    max = 1.0,
                    increment = 0.01,
                },
                head = new
                {
                    min = 0.95,
                    max = 1.0,
                    increment = 0.01,
                },
                proportion = new
                {
                    min = 0.0,
                    max = 1.0,
                    increment = 0.01,
                },
                bodyType = new
                {
                    min = 0.0,
                    max = 1.0,
                    increment = 0.01,
                },
            },
            wearableAssetTypes = new List<dynamic>()
            {
                new { maxNumber = 3, id = 8, name = "Hat" },
                new { maxNumber = 1, id = 41, name = "Hair Accessory" },
                new { maxNumber = 1, id = 42, name = "Face Accessory" },
                new { maxNumber = 1, id = 43, name = "Neck Accessory" },
                new { maxNumber = 1, id = 44, name = "Shoulder Accessory" },
                new { maxNumber = 1, id = 45, name = "Front Accessory" },
                new { maxNumber = 1, id = 46, name = "Back Accessory" },
                new { maxNumber = 1, id = 47, name = "Waist Accessory" },
                new { maxNumber = 1, id = 18, name = "Face" },
                new { maxNumber = 1, id = 19, name = "Gear" },
                new { maxNumber = 1, id = 17, name = "Head" },
                new { maxNumber = 1, id = 29, name = "Left Arm" },
                new { maxNumber = 1, id = 30, name = "Left Leg" },
                new { maxNumber = 1, id = 12, name = "Pants" },
                new { maxNumber = 1, id = 28, name = "Right Arm" },
                new { maxNumber = 1, id = 31, name = "Right Leg" },
                new { maxNumber = 1, id = 11, name = "Shirt" },
                new { maxNumber = 1, id = 2, name = "T-Shirt" },
                new { maxNumber = 1, id = 27, name = "Torso" },
                new { maxNumber = 1, id = 48, name = "Climb Animation" },
                new { maxNumber = 1, id = 49, name = "Death Animation" },
                new { maxNumber = 1, id = 50, name = "Fall Animation" },
                new { maxNumber = 1, id = 51, name = "Idle Animation" },
                new { maxNumber = 1, id = 52, name = "Jump Animation" },
                new { maxNumber = 1, id = 53, name = "Run Animation" },
                new { maxNumber = 1, id = 54, name = "Swim Animation" },
                new { maxNumber = 1, id = 55, name = "Walk Animation" },
                new { maxNumber = 1, id = 56, name = "Pose Animation" },
                new { maxNumber = 0, id = 61, name = "Emote Animation" },
            },
            bodyColorsPalette = Roblox.Models.Avatar.AvatarMetadata.GetColors(),
            basicBodyColorsPalette = new List<dynamic>()
            {
              new { brickColorId = 364, hexColor = "#5A4C42", name = "Dark taupe" },
				new { brickColorId = 217, hexColor = "#7C5C46", name = "Brown" },
				new { brickColorId = 359, hexColor = "#AF9483", name = "Linen" },
				new { brickColorId = 18, hexColor = "#CC8E69", name = "Nougat" },
				new {
					brickColorId = 125,
					hexColor = "#EAB892",
					name = "Light orange",
				},
				new { brickColorId = 361, hexColor = "#564236", name = "Dirt brown" },
				new {
					brickColorId = 192,
					hexColor = "#694028",
					name = "Reddish brown",
				},
				new { brickColorId = 351, hexColor = "#BC9B5D", name = "Cork" },
				new { brickColorId = 352, hexColor = "#C7AC78", name = "Burlap" },
				new { brickColorId = 5, hexColor = "#D7C59A", name = "Brick yellow" },
				new { brickColorId = 153, hexColor = "#957977", name = "Sand red" },
				new { brickColorId = 1007, hexColor = "#A34B4B", name = "Dusty Rose" },
				new { brickColorId = 101, hexColor = "#DA867A", name = "Medium red" },
				new {
					brickColorId = 1025,
					hexColor = "#FFC9C9",
					name = "Pastel orange",
				},
				new {
					brickColorId = 330,
					hexColor = "#FF98DC",
					name = "Carnation pink",
				},
				new { brickColorId = 135, hexColor = "#74869D", name = "Sand blue" },
				new { brickColorId = 305, hexColor = "#527CAE", name = "Steel blue" },
				new { brickColorId = 11, hexColor = "#80BBDC", name = "Pastel Blue" },
				new {
					brickColorId = 1026,
					hexColor = "#B1A7FF",
					name = "Pastel violet",
				},
				new { brickColorId = 321, hexColor = "#A75E9B", name = "Lilac" },
				new {
					brickColorId = 107,
					hexColor = "#008F9C",
					name = "Bright bluish green",
				},
				new { brickColorId = 310, hexColor = "#5B9A4C", name = "Shamrock" },
				new { brickColorId = 317, hexColor = "#7C9C6B", name = "Moss" },
				new { brickColorId = 29, hexColor = "#A1C48C", name = "Medium green" },
				new {
					brickColorId = 105,
					hexColor = "#E29B40",
					name = "Br. yellowish orange",
				},
				new {
					brickColorId = 24,
					hexColor = "#F5CD30",
					name = "Bright yellow",
				},
				new {
					brickColorId = 334,
					hexColor = "#F8D96D",
					name = "Daisy orange",
				},
				new {
					brickColorId = 199,
					hexColor = "#635F62",
					name = "Dark stone grey",
				},
				new { brickColorId = 1002, hexColor = "#CDCDCD", name = "Mid gray" },
				new {
					brickColorId = 1001,
					hexColor = "#F8F8F8",
					name = "Institutional white",
				},  
            },
            minimumDeltaEBodyColorDifference = 11.4,
            defaultClothingAssetLists = new
            {
                defaultShirtAssetIds = new List<long>() {1,2},
                defaultPantAssetIds = new List<long>() {1,2},
            },
            bundlesEnabledForUser = false,
            emotesEnabledForUser = false,
        };
    }

    [HttpPost("avatar/set-scales"), HttpPost("avatar/set-player-avatar-type")]
    public void AvatarNoOp()
    {
        
    }

    [HttpPost("upload-thumbnail-v1")]
    public async Task<dynamic> UploadThumbnail([FromBody] UploadThumbnailRequest request)
    {
        Console.WriteLine("[UploadThumbnail] Request received: userId={0}, thumbnail length={1}, isHeadshot={2}", 
            request?.userId, request?.thumbnail?.Length ?? 0, request?.isHeadshot ?? false);
        
        if (request == null)
        {
            Console.WriteLine("[UploadThumbnail] Request is null!");
            throw new BadRequestException(0, "Request body is null");
        }

        Console.WriteLine("[UploadThumbnail] Request object: userId={0}, thumbnail={1}, isHeadshot={2}, accessKey={3}, jobId={4}",
            request.userId ?? "null",
            request.thumbnail == null ? "null" : $"length={request.thumbnail.Length}",
            request.isHeadshot,
            request.accessKey ?? "null",
            request.jobId ?? "null");
        
        if (string.IsNullOrEmpty(request.userId) || string.IsNullOrEmpty(request.thumbnail))
        {
            Console.WriteLine("[UploadThumbnail] Validation failed: userId={0}, thumbnail={1}", 
                string.IsNullOrEmpty(request?.userId) ? "empty" : "present",
                string.IsNullOrEmpty(request?.thumbnail) ? "empty" : "present");
            throw new BadRequestException(0, "Missing userId or thumbnail");
        }

        if (!long.TryParse(request.userId, out var userId))
        {
            Console.WriteLine("[UploadThumbnail] Invalid userId: {0}", request.userId);
            throw new BadRequestException(0, "Invalid userId");
        }

        // Decode base64 thumbnail
        byte[] imageData;
        try
        {
            imageData = Convert.FromBase64String(request.thumbnail);
        }
        catch (Exception ex)
        {
            Console.WriteLine("[UploadThumbnail] Base64 decode failed: {0}", ex.Message);
            throw new BadRequestException(0, "Invalid base64 thumbnail");
        }

        // Generate a unique filename
        var filename = Guid.NewGuid().ToString();
        var filepath = Path.Combine(Roblox.Configuration.ThumbnailsDirectory, filename + ".png");

        // Save the file
        await System.IO.File.WriteAllBytesAsync(filepath, imageData);
        Console.WriteLine("[UploadThumbnail] Saved thumbnail to {0}", filepath);

        // Update the database with the thumbnail URL
        using var avatarService = ServiceProvider.GetOrCreate<AvatarService>();
        
        // Determine if this is a headshot or regular thumbnail based on the request
        var thumbnailUrl = "/images/thumbnails/" + filename + ".png";
        var headshotUrl = request.isHeadshot ? thumbnailUrl : null;
        var regularThumbnailUrl = !request.isHeadshot ? thumbnailUrl : null;

        // Get existing URLs
        var existingAvatar = await avatarService.GetAvatar(userId);
        var finalHeadshotUrl = request.isHeadshot ? thumbnailUrl : existingAvatar.headshotUrl;
        var finalThumbnailUrl = !request.isHeadshot ? thumbnailUrl : existingAvatar.thumbnailUrl;

        await avatarService.UpdateUserAvatarImages(userId, finalHeadshotUrl, finalThumbnailUrl);
        Console.WriteLine("[UploadThumbnail] Updated avatar images for userId={0}", userId);

        // Clear the render status so the frontend knows rendering is complete
        using var cache = ServiceProvider.GetOrCreate<AvatarCache>();
        await cache.UnscheduleRenderAsync(userId);
        Console.WriteLine("[UploadThumbnail] Render status cleared for userId={0}", userId);

        return new { success = true };
    }
}