using FluentValidation;
using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Validators;

public class CreateDirectMessageRequestValidator : AbstractValidator<CreateDirectMessageRequest>
{
    private const int MaxMessageLength = 500;
    private const int MinMessageLength = 1;

    public CreateDirectMessageRequestValidator()
    {
        // SenderId valideras inte här eftersom den sätts från JWT token i controllern
        // Validera RecipientId
        RuleFor(x => x.RecipientId)
            .NotEmpty()
            .WithMessage("Mottagare-ID är obligatoriskt.")
            .NotEqual(Guid.Empty)
            .WithMessage("Mottagare-ID får inte vara tomt.");

        // Validera att avsändare och mottagare inte är samma (valideras i service layer)
        // Detta valideras i service layer efter att SenderId har satts från token

        // Validera Message
        RuleFor(x => x.Message)
            .MaximumLength(MaxMessageLength)
            .WithMessage($"Meddelande får inte vara längre än {MaxMessageLength} tecken.");

        RuleFor(x => x)
            .Must(request => !string.IsNullOrWhiteSpace(request.Message) || !string.IsNullOrWhiteSpace(request.MediaUrl))
            .WithMessage("Direktmeddelandet måste innehålla text eller media.");
    }
}

