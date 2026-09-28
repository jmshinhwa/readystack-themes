# prod data tier (us-east-1)
resource "aws_db_instance" "orders" {
  identifier     = "orders-prod"
  engine         = "mysql"
  engine_version = "8.0.39"
  instance_class = "db.r6g.2xlarge"
  multi_az       = true
}

resource "aws_db_instance" "legacy" {
  identifier     = "legacy-crm"
  engine         = "mysql"
  engine_version = "5.7.44"
  instance_class = "db.m5.xlarge"
}

resource "aws_db_instance" "reports" {
  identifier     = "reports"
  engine         = "postgres"
  engine_version = "13.14"
  instance_class = "db.r6i.large"
}

resource "aws_rds_cluster" "events" {
  cluster_identifier = "events"
  engine             = "aurora-postgresql"
  engine_version     = "12.19"
}

resource "aws_rds_cluster_instance" "events" {
  count              = 2
  cluster_identifier = aws_rds_cluster.events.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.events.engine
}

resource "aws_rds_cluster" "auth" {
  cluster_identifier = "auth"
  engine             = "aurora-mysql"
  engine_version     = "5.7.mysql_aurora.2.11.3"
}

resource "aws_rds_cluster_instance" "auth" {
  cluster_identifier = aws_rds_cluster.auth.id
  instance_class     = "db.t3.medium"
}

resource "aws_db_instance" "analytics" {
  identifier     = "analytics"
  engine         = "postgres"
  engine_version = "14.12"
  instance_class = "db.r6g.xlarge"
}
