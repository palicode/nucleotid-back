
module.exports =
      {
	  dev: {
	      https_port:    '443',
	      database_host: '',
	      database_name: 'dev',
	      backend_url:   'https://api.nucleotid-dev.com',
	      frontend_url:  'https://nucleotid-dev.com',
	      cors_origins:  ['https://nucleotid-dev.com']
	  },
	  test: {
	      https_port:    '443',
	      database_host: '',
	      database_name: 'test',
	      backend_url:   'https://api.nucleotid-dev.com',
	      frontend_url:  'https://nucleotid-dev.com',
	      cors_origins:  ['https://nucleotid-dev.com']
	  },
	  production: {
	      https_port:    '443',
	      database_host: '',
	      database_name: 'nucleotid',
	      backend_url:   'https://api.nucleotid.com',
	      frontend_url:  'https://nucleotid.com',
	      cors_origins:  ['https://nucleotid.com', 'https://www.nucleotid.com']
	  }
      };


