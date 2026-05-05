using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialTDD.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPostReposts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OriginalPostId",
                table: "Posts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Posts_OriginalPostId",
                table: "Posts",
                column: "OriginalPostId");

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Posts_OriginalPostId",
                table: "Posts",
                column: "OriginalPostId",
                principalTable: "Posts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Posts_OriginalPostId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_OriginalPostId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "OriginalPostId",
                table: "Posts");
        }
    }
}