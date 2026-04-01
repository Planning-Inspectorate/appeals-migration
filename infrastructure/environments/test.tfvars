apps_config = {
  app_service_plan = {
    sku                      = "P0v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = false
  }

  auth = {
    client_id                = "9692d222-d3aa-4f21-bee8-c5b1dfab2b5b"
    group_application_access = "7760d7fc-d26c-442b-8275-d038bcec1325"
  }

  functions_node_version = 22

  logging = {
    level = "info"
  }

  manage = {
    app_service_plan = {
      sku                      = "B2"
      per_site_scaling_enabled = false
      worker_count             = 1
      zone_balancing_enabled   = false
    }
    domain = "manage-appeals-migration-test.planninginspectorate.gov.uk"
  }

  migration = {
    buffer_per_worker     = 500
    maximum_parallelism   = 5
    dispatcher_start_hour = 6
    dispatcher_end_hour   = 22
  }

  redis = {
    capacity = 0
    family   = "C"
    sku_name = "Basic"
  }
}

common_config = {
  resource_group_name = "pins-rg-common-test-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-test"
    its      = "pins-ag-odt-its-test"
    info_sec = "pins-ag-odt-info-sec-test"
  }
  vnet_name = "pins-vnet-common-test-ukw-001"
}

environment = "test"

front_door_config = {
  name        = "pins-fd-common-tooling"
  rg          = "pins-rg-common-tooling"
  ep_name     = "pins-fde-appeals"
  use_tooling = true
  waf_rate_limits = {
    enabled             = true
    duration_in_minutes = 5
    threshold           = 1500
  }
}

manage_appeals_config = {
  documents_account_name   = "pinsstdocsappealsbotest"
  documents_container_name = "appeals-bo-documents"
  database_server_name     = "pins-sql-appeals-bo-primary-test"
  database_name            = "pins-sqldb-appeals-bo-test"
  network_name             = "pins-vnet-appeals-bo-test"
  resource_group_name      = "pins-rg-appeals-bo-test"
  service_bus_name         = "pins-sb-appeals-bo-test"
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
