using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialTDD.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGifAttachmentsForPostsAndDirectMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GifUrl",
                table: "Posts",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GifUrl",
                table: "DirectMessages",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GifUrl",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "GifUrl",
                table: "DirectMessages");
        }
    }
}
