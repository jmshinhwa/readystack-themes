# staging network and cluster for the orders service
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name               = "orders-staging"
  cidr               = "10.20.0.0/16"
  azs                = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets    = ["10.20.1.0/24", "10.20.2.0/24", "10.20.3.0/24"]
  public_subnets     = ["10.20.101.0/24", "10.20.102.0/24", "10.20.103.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = false

  map_public_ip_on_launch = true
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "orders-staging"
  cluster_version = "1.33"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
}

resource "aws_ebs_volume" "scratch" {
  availability_zone = "us-east-1a"
  size              = 200
  type              = "gp2"
}

resource "aws_cloudwatch_log_group" "orders" {
  name              = "/orders/staging"
  retention_in_days = 0
}

resource "aws_db_instance" "orders" {
  identifier     = "orders-staging"
  engine         = "postgres"
  instance_class = "db.t4g.medium"
  multi_az       = true
}
