namespace Roblox.Website.WebsiteModels;

public class UploadThumbnailRequest
{
    public string userId { get; set; }
    public string thumbnail { get; set; }
    public bool isHeadshot { get; set; }
    // Extra fields from RCCService that we ignore
    public string accessKey { get; set; }
    public string jobId { get; set; }
}
