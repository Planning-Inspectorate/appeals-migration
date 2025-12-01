apps_config = {
  app_service_plan = {
    sku                      = "P0v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = false
  }

  functions_node_version = 22
}

common_config = {
  resource_group_name = "pins-rg-common-prod-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-prod"
    its      = "pins-ag-odt-its-prod"
    info_sec = "pins-ag-odt-info-sec-prod"
  }
}

environment = "prod"

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