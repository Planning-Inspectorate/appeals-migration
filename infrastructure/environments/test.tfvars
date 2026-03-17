apps_config = {
  app_service_plan = {
    sku                      = "P0v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = false
  }

  functions_node_version = 22

  migration = {
    buffer_per_worker     = 500
    maximum_parallelism   = 5
    dispatcher_start_hour = 6
    dispatcher_end_hour   = 22
  }
}

common_config = {
  resource_group_name = "pins-rg-common-test-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-test"
    its      = "pins-ag-odt-its-test"
    info_sec = "pins-ag-odt-info-sec-test"
  }
}

environment = "test"

manage_appeals_config = {
  database_server_name = "pins-sql-appeals-bo-primary-test"
  database_name        = "pins-sqldb-appeals-bo-test"
  network_name         = "pins-vnet-appeals-bo-test"
  resource_group_name  = "pins-rg-appeals-bo-test"
  service_bus_name     = "pins-sb-appeals-bo-test"
}

monitoring_config = {
  alerts_enabled = false
  log_daily_cap  = 0.1
}

odw_config = {
  data_lake_storage_account_id  = "pinsstodwtestukswic3ai"
  data_lake_resource_group_name = "pins-rg-data-odw-test-uks"
  network_resource_group_name   = "pins-rg-network-odw-test-uks"
  network_name                  = "vnet-odw-test-uks"
  subscription_id               = "6b18ba9d-2399-48b5-a834-e0f267be122d"
  resource_group_name           = "pins-rg-ingestion-odw-test-uks"
  synapse_ssql_endpoint         = "pins-synw-odw-test-uks-ondemand.sql.azuresynapse.net"
}

sql_config = {
  admin = {
    login_username = "pins-appeals-migration-sql-test"
    object_id      = "2deaca68-2844-4345-8feb-8a67d7aa910c"
  }
  sku_name    = "Basic"
  max_size_gb = 2
  retention = {
    audit_days             = 7
    short_term_days        = 7
    long_term_weekly       = "P1W"
    long_term_monthly      = "P1M"
    long_term_yearly       = "P1Y"
    long_term_week_of_year = 1
  }
}

vnet_config = {
  address_space             = "10.35.4.0/22"
  apps_subnet_address_space = "10.35.4.0/24"
  main_subnet_address_space = "10.35.5.0/24"
}
