resource "azurerm_key_vault" "main" {
  name                          = "${local.org}-kv-${local.shorter_resource_suffix}"
  location                      = module.primary_region.location
  resource_group_name           = azurerm_resource_group.primary.name
  enabled_for_disk_encryption   = false
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days    = 7
  purge_protection_enabled      = true
  rbac_authorization_enabled    = true
  sku_name                      = "standard"
  public_network_access_enabled = false

  network_acls {
    bypass         = "None"
    default_action = "Deny"
    virtual_network_subnet_ids = [
      azurerm_subnet.main.id,
      azurerm_subnet.apps.id
    ]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "key_vault" {
  name                = "${local.org}-pe-${local.service_name}-kv-${var.environment}"
  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location
  subnet_id           = azurerm_subnet.main.id

  private_dns_zone_group {
    name                 = "keyvaultprivatednszone"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.key_vault.id]
  }

  private_service_connection {
    name                           = "privateendpointconnection"
    private_connection_resource_id = azurerm_key_vault.main.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  tags = local.tags
}