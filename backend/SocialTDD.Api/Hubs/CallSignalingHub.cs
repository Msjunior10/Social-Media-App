using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Api.Hubs;

[Authorize]
public class CallSignalingHub : Hub
{
    public const string CallStartedMethod = "callStarted";
    public const string CallEndedMethod = "callEnded";
    public const string OfferReceivedMethod = "offerReceived";
    public const string AnswerReceivedMethod = "answerReceived";
    public const string IceCandidateReceivedMethod = "iceCandidateReceived";
    public const string ParticipantJoinedMethod = "participantJoined";
    public const string ParticipantLeftMethod = "participantLeft";

    private readonly IConversationRepository _conversationRepository;

    public CallSignalingHub(IConversationRepository conversationRepository)
    {
        _conversationRepository = conversationRepository;
    }

    public async Task JoinConversation(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);

        var groupName = GetConversationGroup(conversationId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync(
            ParticipantJoinedMethod,
            new
            {
                conversationId,
                userId = currentUserId,
                connectedAt = DateTime.UtcNow
            });
    }

    public async Task LeaveConversation(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);

        var groupName = GetConversationGroup(conversationId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        await Clients.Group(groupName).SendAsync(
            ParticipantLeftMethod,
            new
            {
                conversationId,
                userId = currentUserId,
                disconnectedAt = DateTime.UtcNow
            });
    }

    public async Task StartCall(Guid conversationId, string callType)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);

        var normalizedCallType = string.IsNullOrWhiteSpace(callType)
            ? "voice"
            : callType.Trim().ToLowerInvariant();

        if (normalizedCallType != "voice" && normalizedCallType != "video")
        {
            throw new HubException("Call type must be either 'voice' or 'video'.");
        }

        await Clients.Group(GetConversationGroup(conversationId)).SendAsync(
            CallStartedMethod,
            new
            {
                conversationId,
                callType = normalizedCallType,
                startedByUserId = currentUserId,
                startedAt = DateTime.UtcNow
            });
    }

    public async Task EndCall(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);

        await Clients.Group(GetConversationGroup(conversationId)).SendAsync(
            CallEndedMethod,
            new
            {
                conversationId,
                endedByUserId = currentUserId,
                endedAt = DateTime.UtcNow
            });
    }

    public async Task SendOffer(Guid conversationId, Guid targetUserId, string sdp)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);
        await EnsureConversationMembershipAsync(conversationId, targetUserId);

        if (string.IsNullOrWhiteSpace(sdp))
        {
            throw new HubException("Offer SDP cannot be empty.");
        }

        await Clients.User(targetUserId.ToString()).SendAsync(
            OfferReceivedMethod,
            new
            {
                conversationId,
                fromUserId = currentUserId,
                sdp
            });
    }

    public async Task SendAnswer(Guid conversationId, Guid targetUserId, string sdp)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);
        await EnsureConversationMembershipAsync(conversationId, targetUserId);

        if (string.IsNullOrWhiteSpace(sdp))
        {
            throw new HubException("Answer SDP cannot be empty.");
        }

        await Clients.User(targetUserId.ToString()).SendAsync(
            AnswerReceivedMethod,
            new
            {
                conversationId,
                fromUserId = currentUserId,
                sdp
            });
    }

    public async Task SendIceCandidate(Guid conversationId, Guid targetUserId, string candidate, string? sdpMid, int? sdpMLineIndex)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);
        await EnsureConversationMembershipAsync(conversationId, targetUserId);

        if (string.IsNullOrWhiteSpace(candidate))
        {
            throw new HubException("ICE candidate cannot be empty.");
        }

        await Clients.User(targetUserId.ToString()).SendAsync(
            IceCandidateReceivedMethod,
            new
            {
                conversationId,
                fromUserId = currentUserId,
                candidate,
                sdpMid,
                sdpMLineIndex
            });
    }

    private Guid GetCurrentUserId()
    {
        var userIdentifier = Context.UserIdentifier;
        if (!Guid.TryParse(userIdentifier, out var parsedUserId))
        {
            throw new HubException("Unauthorized: user id missing or invalid.");
        }

        return parsedUserId;
    }

    private async Task EnsureConversationMembershipAsync(Guid conversationId, Guid userId)
    {
        var isMember = await _conversationRepository.IsConversationMemberAsync(conversationId, userId);
        if (!isMember)
        {
            throw new HubException("User is not a member of this conversation.");
        }
    }

    public static string GetConversationGroup(Guid conversationId) => $"calls:conversation:{conversationId}";
}
