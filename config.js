/* SECRETS THAT MUST BE DEFINED IN ENV VARIABLES
**
** NUCLEOTID_OAUTH_SIGNATURE_SECRET
** POSTGRES_USER
** POSTGRES_PASSWORD
** NUCLEOTID_GOOGLE_OAUTH_CLIENTID
** NUCLEOTID_GOOGLE_OAUTH_SECRET
** NUCLEOTID_MAILER_ADDRESS
** NUCLEOTID_MAILER_PASSWORD
** 
*/
module.exports =
      {
	  dev: {
	      https_port:    '3443',
	      database_host: '192.168.100.3',
	      database_name: 'dev',
	      backend_url:   'https://api.nucleotid-dev.com',
	      frontend_url:  'https://nucleotid-dev.com',
	      cors_origins:  ['https://nucleotid-dev.com']
	  },
	  test: {
	      https_port:    '3443',
	      database_host: '192.168.100.3',
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


