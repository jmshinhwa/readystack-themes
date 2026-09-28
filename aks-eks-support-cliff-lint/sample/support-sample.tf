# payments-platform/clusters.tf
resource "aws_eks_cluster" "payments" {
  name     = "payments-prod"
  role_arn = aws_iam_role.eks.arn
  version  = "1.32"

  vpc_config {
    subnet_ids = var.private_subnets
  }
}

resource "aws_eks_cluster" "batch" {
  name     = "batch-prod"
  role_arn = aws_iam_role.eks.arn
  version  = "1.31"

  upgrade_policy {
    support_type = "EXTENDED"
  }

  vpc_config {
    subnet_ids = var.private_subnets
  }
}

resource "aws_eks_cluster" "web" {
  name     = "web-prod"
  role_arn = aws_iam_role.eks.arn
  version  = "1.34"

  upgrade_policy {
    support_type = "STANDARD"
  }

  vpc_config {
    subnet_ids = var.private_subnets
  }
}

resource "azurerm_kubernetes_cluster" "core" {
  name                = "aks-core-weu"
  location            = "westeurope"
  resource_group_name = azurerm_resource_group.core.name
  dns_prefix          = "core"
  kubernetes_version  = "1.31"
  sku_tier            = "Standard"
  support_plan        = "AKSLongTermSupport"

  default_node_pool {
    name       = "system"
    node_count = 3
    vm_size    = "Standard_D4s_v5"
  }
}

resource "azurerm_kubernetes_cluster" "legacy" {
  name                = "aks-legacy-weu"
  location            = "westeurope"
  resource_group_name = azurerm_resource_group.core.name
  dns_prefix          = "legacy"
  kubernetes_version  = "1.33.2"
  sku_tier            = "Standard"

  default_node_pool {
    name       = "system"
    node_count = 2
    vm_size    = "Standard_D4s_v5"
  }
}

resource "azurerm_kubernetes_cluster" "analytics" {
  name                = "aks-analytics-weu"
  location            = "westeurope"
  resource_group_name = azurerm_resource_group.core.name
  dns_prefix          = "analytics"
  kubernetes_version  = "1.35"
  sku_tier            = "Premium"
  support_plan        = "AKSLongTermSupport"

  default_node_pool {
    name       = "system"
    node_count = 3
    vm_size    = "Standard_D4s_v5"
  }
}
