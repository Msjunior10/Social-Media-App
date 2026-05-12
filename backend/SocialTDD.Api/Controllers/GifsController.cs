using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;

namespace SocialTDD.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GifsController : ControllerBase
{
    private const string GiphyApiBaseUrl = "https://api.giphy.com/v1";
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GifsController> _logger;

    public GifsController(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<GifsController> logger)
    {
        _httpClient = httpClientFactory.CreateClient(nameof(GifsController));
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("trending")]
    public async Task<ActionResult<IReadOnlyList<GifSearchResponseItem>>> GetTrending([FromQuery] int limit = 18)
    {
        try
        {
            var result = await FetchGifsAsync("gifs/trending", new Dictionary<string, string>
            {
                ["limit"] = Math.Clamp(limit, 1, 24).ToString(),
                ["rating"] = "g",
                ["bundle"] = "messaging_non_clips"
            });

            return Ok(result);
        }
        catch (GifSearchUnavailableException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
    }

    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<GifSearchResponseItem>>> Search([FromQuery] string query, [FromQuery] int limit = 18)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new { message = "A search query is required." });
        }

        try
        {
            var result = await FetchGifsAsync("gifs/search", new Dictionary<string, string>
            {
                ["q"] = query.Trim(),
                ["limit"] = Math.Clamp(limit, 1, 24).ToString(),
                ["rating"] = "g",
                ["lang"] = "en",
                ["bundle"] = "messaging_non_clips"
            });

            return Ok(result);
        }
        catch (GifSearchUnavailableException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
    }

    [HttpGet("topics")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetTrendingTopics()
    {
        var apiKey = GetApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "GIF search is not configured on the server." });
        }

        var endpoint = $"{GiphyApiBaseUrl}/trending/searches?api_key={Uri.EscapeDataString(apiKey)}";

        try
        {
            using var response = await _httpClient.GetAsync(endpoint);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("GIPHY trending topics request failed with status {StatusCode}", response.StatusCode);
                return StatusCode(StatusCodes.Status502BadGateway, new { message = "Could not load GIF topics right now." });
            }

            var payload = await response.Content.ReadFromJsonAsync<GiphyTopicsPayload>();
            var topics = payload?.Data?
                .Where(topic => !string.IsNullOrWhiteSpace(topic))
                .Take(8)
                .ToList() ?? [];

            return Ok(topics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while loading GIF topics");
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Could not load GIF topics right now." });
        }
    }

    private async Task<IReadOnlyList<GifSearchResponseItem>> FetchGifsAsync(string path, IReadOnlyDictionary<string, string> queryParameters)
    {
        var apiKey = GetApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new GifSearchUnavailableException("GIF search is not configured on the server.");
        }

        var parameters = new List<string> { $"api_key={Uri.EscapeDataString(apiKey)}" };
        parameters.AddRange(queryParameters.Select(parameter => $"{Uri.EscapeDataString(parameter.Key)}={Uri.EscapeDataString(parameter.Value)}"));
        var endpoint = $"{GiphyApiBaseUrl}/{path}?{string.Join("&", parameters)}";

        try
        {
            using var response = await _httpClient.GetAsync(endpoint);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("GIPHY request to {Path} failed with status {StatusCode}", path, response.StatusCode);
                throw new GifSearchUnavailableException("Could not load GIFs right now.");
            }

            var payload = await response.Content.ReadFromJsonAsync<GiphySearchPayload>();
            return payload?.Data?
                .Select(MapGifItem)
                .Where(item => !string.IsNullOrWhiteSpace(item.PreviewUrl) && !string.IsNullOrWhiteSpace(item.MediaUrl))
                .ToList() ?? [];
        }
        catch (GifSearchUnavailableException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while loading GIFs from {Path}", path);
            throw new GifSearchUnavailableException("Could not load GIFs right now.");
        }
    }

    private string? GetApiKey()
    {
        return _configuration["Giphy:ApiKey"];
    }

    private static GifSearchResponseItem MapGifItem(GiphyGifItem item)
    {
        var previewUrl = item.Images?.FixedWidthSmall?.Url
            ?? item.Images?.FixedHeightSmall?.Url
            ?? item.Images?.PreviewGif?.Url
            ?? item.Images?.Original?.Url
            ?? string.Empty;

        var mediaUrl = item.Images?.DownsizedMedium?.Url
            ?? item.Images?.Downsized?.Url
            ?? item.Images?.Original?.Url
            ?? previewUrl;

        return new GifSearchResponseItem(
            item.Id ?? string.Empty,
            item.Title ?? item.AltText ?? "GIF",
            previewUrl,
            mediaUrl,
            item.Url ?? string.Empty,
            item.AltText ?? item.Title ?? "GIF result");
    }

    private sealed class GifSearchUnavailableException(string message) : Exception(message);

    private sealed class GiphyTopicsPayload
    {
        public List<string>? Data { get; set; }
    }

    private sealed class GiphySearchPayload
    {
        public List<GiphyGifItem>? Data { get; set; }
    }

    private sealed class GiphyGifItem
    {
        public string? Id { get; set; }
        public string? Title { get; set; }
        public string? Url { get; set; }

        [JsonPropertyName("alt_text")]
        public string? AltText { get; set; }

        public GiphyImages? Images { get; set; }
    }

    private sealed class GiphyImages
    {
        [JsonPropertyName("fixed_width_small")]
        public GiphyImageVariant? FixedWidthSmall { get; set; }

        [JsonPropertyName("fixed_height_small")]
        public GiphyImageVariant? FixedHeightSmall { get; set; }

        [JsonPropertyName("preview_gif")]
        public GiphyImageVariant? PreviewGif { get; set; }

        public GiphyImageVariant? Downsized { get; set; }

        [JsonPropertyName("downsized_medium")]
        public GiphyImageVariant? DownsizedMedium { get; set; }

        public GiphyImageVariant? Original { get; set; }
    }

    private sealed class GiphyImageVariant
    {
        public string? Url { get; set; }
    }

    public sealed record GifSearchResponseItem(string Id, string Title, string PreviewUrl, string MediaUrl, string GiphyUrl, string AltText);
}