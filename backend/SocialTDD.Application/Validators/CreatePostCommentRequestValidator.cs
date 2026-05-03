using FluentValidation;
using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Validators;

public class CreatePostCommentRequestValidator : AbstractValidator<CreatePostCommentRequest>
{
    private const int MaxMessageLength = 500;
    private const int MinMessageLength = 1;

    public CreatePostCommentRequestValidator()
    {
        RuleFor(x => x.Message)
            .NotNull()
            .WithMessage("Kommentar är obligatorisk.")
            .Must(message => !string.IsNullOrWhiteSpace(message))
            .WithMessage("Kommentar får inte vara tom eller bara innehålla mellanslag.")
            .MinimumLength(MinMessageLength)
            .WithMessage($"Kommentar måste vara minst {MinMessageLength} tecken.")
            .MaximumLength(MaxMessageLength)
            .WithMessage($"Kommentar får inte vara längre än {MaxMessageLength} tecken.")
            .Must(message => message != null && message.Trim().Length >= MinMessageLength)
            .WithMessage($"Kommentar måste vara minst {MinMessageLength} tecken efter borttagning av mellanslag.");
    }
}