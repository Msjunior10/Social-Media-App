using FluentValidation;
using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Användarnamn är obligatoriskt.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Lösenord är obligatoriskt.");
    }
}