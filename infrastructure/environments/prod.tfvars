apps_config = {
  app_service_plan = {
    sku                      = "P0v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = false
  }

  auth = {
    client_id                = "b1f8cb48-656c-4c00-93fc-8a0f79e2679a"
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
    domain = "manage-appeals-migration.planninginspectorate.gov.uk"
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
  resource_group_name = "pins-rg-common-prod-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-prod"
    its      = "pins-ag-odt-its-prod"
    info_sec = "pins-ag-odt-info-sec-prod"
  }
  vnet_name = "pins-vnet-common-prod-ukw-001"
}

environment = "prod"

front_door_config = {
  name        = "pins-fd-common-prod"
  rg          = "pins-rg-common-prod"
  ep_name     = "pins-fde-appeals-prod"
  use_tooling = false
  waf_rate_limits = {
    enabled             = true
    duration_in_minutes = 5
    threshold           = 1500
  }
}

manage_appeals_config = {
  database_server_name = "pins-sql-appeals-bo-primary-prod"
  database_name        = "pins-sqldb-appeals-bo-prod"
  network_name         = "pins-vnet-appeals-bo-prod"
  resource_group_name  = "pins-rg-appeals-bo-prod"
  service_bus_name     = "pins-sb-appeals-bo-prod"
}

monitoring_config = {
  alerts_enabled = true
  log_daily_cap  = 0.1
}

sql_config = {
  admin = {
    login_username = "pins-appeals-migration-sql-prod"
    object_id      = "c0cbf326-9249-461f-aa6f-5e34a847588b"
  }
  sku_name    = "S0"
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
  address_space             = "10.35.12.0/22"
  apps_subnet_address_space = "10.35.12.0/24"
  main_subnet_address_space = "10.35.13.0/24"
}