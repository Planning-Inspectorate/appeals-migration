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
data "azurerm_storage_container" "appeals_documents" {
  name                 = var.manage_appeals_config.documents_container_name
  storage_account_name = var.manage_appeals_config.documents_account_name
}

resource "azurerm_role_assignment" "document_read_write" {
  scope                = data.azurerm_storage_container.appeals_documents.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.function_main.principal_id
}