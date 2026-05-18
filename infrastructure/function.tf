resource "azurerm_service_plan" "apps" {
  # checkov:skip=CKV_AZURE_212: failover not required
  # checkov:skip=CKV_AZURE_225: zone redundant not required

  name                = "${local.org}-asp-${local.resource_suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location

  os_type                  = "Linux"
  sku_name                 = var.apps_config.app_service_plan.sku
  per_site_scaling_enabled = var.apps_config.app_service_plan.per_site_scaling_enabled
  worker_count             = var.apps_config.app_service_plan.worker_count
  zone_balancing_enabled   = var.apps_config.app_service_plan.zone_balancing_enabled

  tags = local.tags
}


resource "azurerm_storage_account" "functions" {
  #checkov:skip=CKV2_AZURE_1: Customer Managed Keys not implemented yet
  #checkov:skip=CKV2_AZURE_18: Customer Managed Keys not implemented yet
  #checkov:skip=CKV_AZURE_33: Logging not implemented yet
  #checkov:skip=CKV2_AZURE_8: Logging not implemented yet
  #checkov:skip=CKV_AZURE_206: TODO: Ensure that Storage Accounts use replication
  #checkov:skip=CKV2_AZURE_38: "Ensure soft-delete is enabled on Azure storage account"
  #checkov:skip=CKV2_AZURE_40: "Ensure storage account is not configured with Shared Key authorization"
  #checkov:skip=CKV2_AZURE_41: "Ensure storage account is configured with SAS expiration policy"
  name                             = "pinsstfuncamigrat${var.environment}" # local will shorten training to train so storage account name length is =< 24 chars
  resource_group_name              = azurerm_resource_group.primary.name
  location                         = module.primary_region.location
  account_tier                     = "Standard"
  account_replication_type         = "LRS"
  allow_nested_items_to_be_public  = false
  cross_tenant_replication_enabled = false
  https_traffic_only_enabled       = true
  min_tls_version                  = "TLS1_2"
  public_network_access_enabled    = false

  tags = local.tags
}

resource "azurerm_private_endpoint" "functions_storage" {
  name                = "${local.org}-pe-st-funcstorage-${local.resource_suffix}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  subnet_id           = azurerm_subnet.main.id

  private_dns_zone_group {
    name                 = "${local.org}-pdns-${local.service_name}-funcstorage-${var.environment}"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage.id]
  }

  private_service_connection {
    name                           = "${local.org}-psc-funcstorage-${local.resource_suffix}"
    private_connection_resource_id = azurerm_storage_account.functions.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  tags = local.tags
}
