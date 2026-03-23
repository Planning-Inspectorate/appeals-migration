# peer to Manage appeals VNET
data "azurerm_virtual_network" "appeals" {
  name                = var.manage_appeals_config.network_name
  resource_group_name = var.manage_appeals_config.resource_group_name
}


resource "azurerm_virtual_network_peering" "scheduling_to_appeals" {
  name                      = "${local.org}-peer-${local.service_name}-to-appeals-${var.environment}"
  remote_virtual_network_id = data.azurerm_virtual_network.appeals.id
  resource_group_name       = azurerm_virtual_network.main.resource_group_name
  virtual_network_name      = azurerm_virtual_network.main.name
}

resource "azurerm_virtual_network_peering" "appeals_to_scheduling" {
  name                      = "${local.org}-peer-appeals-to-${local.service_name}-${var.environment}"
  remote_virtual_network_id = azurerm_virtual_network.main.id
  resource_group_name       = var.manage_appeals_config.resource_group_name
  virtual_network_name      = var.manage_appeals_config.network_name
}

# RBAC for documents
data "azurerm_storage_account" "appeals_documents" {
  name                = var.manage_appeals_config.documents_account_name
  resource_group_name = var.manage_appeals_config.resource_group_name
}

data "azurerm_storage_container" "appeals_documents" {
  name               = var.manage_appeals_config.documents_container_name
  storage_account_id = data.azurerm_storage_account.appeals_documents.id
}

resource "azurerm_role_assignment" "document_read_write" {
  scope                = data.azurerm_storage_container.appeals_documents.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.function_main.principal_id
}

# SQL
resource "azurerm_key_vault_secret" "manage_appeals_sql_connection_string" {
  # checkov:skip=CKV_AZURE_41: TODO: Secret rotation
  key_vault_id = azurerm_key_vault.main.id
  name         = "manage-appeals-sql-connection-string"
  value = join(
    ";",
    [
      "sqlserver://${var.manage_appeals_config.database_server_name}.database.windows.net",
      "database=${var.manage_appeals_config.database_name}",
      "authentication=DefaultAzureCredential",
      "trustServerCertificate=false"
    ]
  )
  content_type = "connection-string"

  tags = local.tags
}