/*
** Iterative tets over an array of objects which contain the description of the test cases.
*/
module.exports = (test, test_cases, path, method='post') => {
  
  test_cases.forEach((test_case) => {

    // Iterate over test cases.
    it(test_case.test, (done) => {
      // Create request.
      var out = test[method](path+(test_case.pathparams || ""));
      
      // Send data if available.
      if (test_case.data) {
	out = out.send(test_case.data);
      }

      // Set headers.
      if (test_case.headers) {
	test_case.headers.forEach((header) => {
	  out = out.set(header[0], header[1]);
	});
      }
      
      // Expect HTTP status code.
      out = out.expect(test_case.status);
      
      // Check error content
      if (test_case.error) {
	out = out.expect((res) => {
	  if (!(new RegExp(test_case.error)).test(res.body.error))
	    throw new Error(`Error message did not match provided RE (${test_case.error}): ${res.body.error}`);
	});
      }
      
      // Parse return data
      if (test_case.parse) {
	out = out.expect(test_case.parse);
      }
      
      // Finish test
      out.end(done);
    });
    
  });
  
};
