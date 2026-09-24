terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "production"
}

# ECS Fargate Cluster Placeholder
resource "aws_ecs_cluster" "safefood_cluster" {
  name = "safefood-${var.environment}-cluster"
}

# RDS Aurora PostgreSQL with pgvector Placeholder
# S3 Bucket for Compliance Documents Placeholder
resource "aws_s3_bucket" "document_storage" {
  bucket = "safefood-${var.environment}-docs"
}
