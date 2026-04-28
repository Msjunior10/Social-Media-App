using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using FluentValidation;
using FluentValidation.AspNetCore;
using SocialTDD.Application.Configuration;
using SocialTDD.Application.Interfaces;
using SocialTDD.Application.Services;
using SocialTDD.Application.Validators;
using SocialTDD.Infrastructure.Data;
using SocialTDD.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Socially API", Version = "v1" });
    
    // Lägg till JWT authentication i Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    // Security requirement will be added via attributes on controllers/actions
    // This avoids compatibility issues with Microsoft.OpenApi.Models namespace in .NET 9
});

// Add Entity Framework
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure JWT
var jwtConfig = builder.Configuration.GetSection("Jwt").Get<JwtConfiguration>();
if (jwtConfig == null || string.IsNullOrEmpty(jwtConfig.Secret))
{
    throw new InvalidOperationException("JWT configuration is missing or invalid.");
}

builder.Services.AddSingleton(jwtConfig);

var key = Encoding.UTF8.GetBytes(jwtConfig.Secret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtConfig.Issuer,
        ValidAudience = jwtConfig.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero
    };
});

// Add Repositories
builder.Services.AddScoped<IPostRepository, PostRepository>();
builder.Services.AddScoped<IDirectMessageRepository, DirectMessageRepository>();
builder.Services.AddScoped<IFollowRepository, FollowRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// Add Services
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IDirectMessageService, DirectMessageService>();
builder.Services.AddScoped<ITimelineService, TimelineService>();
builder.Services.AddScoped<IFollowService, FollowService>();
builder.Services.AddScoped<IWallService, WallService>();
builder.Services.AddScoped<IUserService, UserService>();

// Add FluentValidation with automatic validation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddFluentValidationClientsideAdapters();
builder.Services.AddValidatorsFromAssemblyContaining<CreatePostRequestValidator>();
builder.Services.AddValidatorsFromAssemblyContaining<CreatePostRequestDtoValidator>();
builder.Services.AddValidatorsFromAssemblyContaining<CreateDirectMessageRequestValidator>();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Socially API v1");
        c.RoutePrefix = string.Empty; // Swagger UI på root
    });
}
else
{
    // Only redirect to HTTPS in production
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseAuthentication(); // Lägg till detta före UseAuthorization
app.UseAuthorization();
app.MapControllers();

app.Run();
