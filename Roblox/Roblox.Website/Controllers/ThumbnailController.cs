using Microsoft.AspNetCore.Mvc;
using Roblox.Exceptions;
using Roblox.Services;
using Roblox.Website.WebsiteModels;
using ServiceProvider = Roblox.Services.ServiceProvider;

namespace Roblox.Website.Controllers;

[ApiController]
[Route("/api")]
public class ThumbnailController : ControllerBase
{
    [HttpPost("upload-thumbnail-v1")]
    public async Task<dynamic> UploadThumbnail([FromBody] UploadThumbnailRequest request)
    {
        Console.WriteLine("[ThumbnailController] UploadThumbnail called with userId={0}", request?.userId);
        if (request == null || string.IsNullOrEmpty(request.userId) || string.IsNullOrEmpty(request.thumbnail))
            throw new BadRequestException(0, "Missing userId or thumbnail");

        if (!long.TryParse(request.userId, out var userId))
            throw new BadRequestException(0, "Invalid userId");

        // Decode base64 thumbnail
        byte[] imageData;
        try
        {
            imageData = Convert.FromBase64String(request.thumbnail);
        }
        catch
        {
            throw new BadRequestException(0, "Invalid base64 thumbnail");
        }

        // Generate a unique filename
        var filename = Guid.NewGuid().ToString();
        var filepath = Path.Combine(Roblox.Configuration.ThumbnailsDirectory, filename + ".png");

        // Save the file
        await System.IO.File.WriteAllBytesAsync(filepath, imageData);
        Console.WriteLine("[ThumbnailController] Saved thumbnail file to {0}", filepath);

        // Update the database with the thumbnail URL
        using var avatarService = ServiceProvider.GetOrCreate<AvatarService>();
        
        // Determine if this is a headshot or regular thumbnail based on the request
        var thumbnailUrl = "images/thumbnails/" + filename + ".png";

        // Get existing URLs
        var existingAvatar = await avatarService.GetAvatar(userId);
        var finalHeadshotUrl = request.isHeadshot ? thumbnailUrl : (existingAvatar?.headshotUrl ?? null);
        var finalThumbnailUrl = !request.isHeadshot ? thumbnailUrl : (existingAvatar?.thumbnailUrl ?? null);

        Console.WriteLine("[ThumbnailController] Updating database for userId={0}, headshotUrl={1}, thumbnailUrl={2}", userId, finalHeadshotUrl, finalThumbnailUrl);
        await avatarService.UpdateUserAvatarImages(userId, finalHeadshotUrl, finalThumbnailUrl);
        Console.WriteLine("[ThumbnailController] Database updated successfully");

        return new { success = true };
    }
}
