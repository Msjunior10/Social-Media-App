using FluentValidation;
using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Validators;

public class CreateFollowRequestValidator : AbstractValidator<CreateFollowRequest>
{
    public CreateFollowRequestValidator()
    {
        // FollowerId valideras inte här eftersom den sätts från JWT token i controllern
        // Validera FollowingId
        RuleFor(x => x.FollowingId)
            .NotEmpty().WithMessage("FollowingId får inte vara tomt.");

        // Validera att följare och följd inte är samma (valideras i service layer)
        // Detta valideras i service layer efter att FollowerId har satts från token
    }
}