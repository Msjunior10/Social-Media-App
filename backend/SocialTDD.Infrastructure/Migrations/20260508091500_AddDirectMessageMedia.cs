using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SocialTDD.Infrastructure.Data;

#nullable disable

namespace SocialTDD.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260508091500_AddDirectMessageMedia")]
public class AddDirectMessageMedia : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "MediaUrl",
            table: "DirectMessages",
            type: "nvarchar(2048)",
            maxLength: 2048,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "MediaUrl",
            table: "DirectMessages");
    }
}