using FluentValidation;
using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Validators;

public class UpdatePostRequestValidator : AbstractValidator<UpdatePostRequest>
{
    private const int MaxMessageLength = 500;
    private const int MinMessageLength = 1;

    public UpdatePostRequestValidator()
    {
        RuleFor(x => x.Message)
            .NotNull()
            .WithMessage("Meddelande är obligatoriskt.")
            .Must(message => !string.IsNullOrWhiteSpace(message))
            .WithMessage("Meddelande får inte vara tomt eller bara innehålla mellanslag.")
            .MinimumLength(MinMessageLength)
            .WithMessage($"Meddelande måste vara minst {MinMessageLength} tecken.")
            .MaximumLength(MaxMessageLength)
            .WithMessage($"Meddelande får inte vara längre än {MaxMessageLength} tecken.")
            .Must(message => message != null && message.Trim().Length >= MinMessageLength)
            .WithMessage($"Meddelande måste vara minst {MinMessageLength} tecken efter borttagning av mellanslag.");
    }
}