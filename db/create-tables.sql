
CREATE TABLE IF NOT EXISTS users (
       id    	    	   bigserial	PRIMARY KEY,
       given_name    	   varchar(50) 	NOT NULL,
       family_name	   varchar(100) NOT NULL,
       email		   varchar(100) NOT NULL,
       username		   varchar(20),
       password		   varchar(256),
       birthdate	   date,
       photo		   varchar(512),
       web_active	   boolean	NOT NULL,
       google_active	   boolean 	NOT NULL,
       google_id	   varchar(100),
       google_accesstoken  varchar(100),
       creation_date	   timestamptz 	NOT NULL
);
       
