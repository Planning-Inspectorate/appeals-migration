# peer to ODW VNET
data "azurerm_virtual_network" "odw" {
  name                = var.odw_config.network_name
  resource_group_name = var.odw_config.network_resource_group_name

  provider = azurerm.odw
}

resource "azurerm_virtual_network_peering" "migration_to_odw" {
  name                      = "${local.org}-peer-${local.service_name}-to-odw-${var.environment}"
  remote_virtual_network_id = data.azurerm_virtual_network.odw.id
  resource_group_name       = azurerm_virtual_network.main.resource_group_name
  virtual_network_name      = azurerm_virtual_network.main.name
}

resource "azurerm_virtual_network_peering" "odw_to_migration" {
  name                      = "${local.org}-peer-odw-to-${local.service_name}-${var.environment}"
  remote_virtual_network_id = azurerm_virtual_network.main.id
  resource_group_name       = var.odw_config.network_resource_group_name
  virtual_network_name      = var.odw_config.network_name

  provider = azurerm.odw
}

# RBAC
data "azurerm_storage_account" "odw_data_lake" {
  name                = var.odw_config.data_lake_storage_account_id
  resource_group_name = var.odw_config.data_lake_resource_group_name

  provider = azurerm.odw
}

resource "azurerm_role_assignment" "read_data_lake_storage" {
  scope                = data.azurerm_storage_account.odw_data_lake.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = module.function_main.principal_id
}

# SQL
resource "azurerm_key_vault_secret" "odw_sql_connection_string" {
  # checkov:skip=CKV_AZURE_41: TODO: Secret rotation
  key_vault_id = azurerm_key_vault.main.id
  name         = "odw-sql-connection-string"
  value = join(
    ";",
    [
      "sqlserver://${var.odw_config.synapse_ssql_endpoint}",
      "database=odw_curated_db",
      "authentication=DefaultAzureCredential",
      "trustServerCertificate=false"
    ]
  )
  content_type = "connection-string"

  tags = local.tags
}