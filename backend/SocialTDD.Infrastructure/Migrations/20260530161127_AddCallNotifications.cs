using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialTDD.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCallNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ConversationId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConversationId",
                table: "Notifications");
        }
    }
}
