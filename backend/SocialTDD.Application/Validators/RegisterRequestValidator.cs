using FluentValidation;
using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Användarnamn är obligatoriskt.")
            .MinimumLength(3).WithMessage("Användarnamn måste vara minst 3 tecken.")
            .MaximumLength(50).WithMessage("Användarnamn får inte vara längre än 50 tecken.")
            .Matches("^[a-zA-Z0-9_]+$").WithMessage("Användarnamn får endast innehålla bokstäver, siffror och understreck.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-post är obligatorisk.")
            .EmailAddress().WithMessage("Ogiltig e-postadress.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Lösenord är obligatoriskt.")
            .MinimumLength(8).WithMessage("Lösenord måste vara minst 8 tecken.")
            .MaximumLength(100).WithMessage("Lösenord får inte vara längre än 100 tecken.")
            .Matches("[A-Z]").WithMessage("Lösenord måste innehålla minst en stor bokstav.")
            .Matches("[a-z]").WithMessage("Lösenord måste innehålla minst en liten bokstav.")
            .Matches("[0-9]").WithMessage("Lösenord måste innehålla minst en siffra.");
    }
}