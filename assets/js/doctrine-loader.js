/**
 * Doctrine Loader
 * Handles loading doctrine data from JSON and provides utility functions
 * for both rules.html and army pages.
 */
(function() {
    // Store loaded doctrine data
    let doctrineData = null;
    
    /**
     * Load the doctrine data from JSON
     * @returns {Promise} - Promise that resolves with the loaded data
     */
    function loadDoctrineData() {
      if (doctrineData !== null) {
        return Promise.resolve(doctrineData);
      }
      
      return fetch('assets/json/doctrines.json')
        .then(response => response.json())
        .then(data => {
          doctrineData = data;
          return data;
        });
    }
    
    /**
     * Get a specific doctrine by ID
     * @param {string} doctrineId - ID of the doctrine to get
     * @returns {Promise} - Promise that resolves with the doctrine object
     */
    function getDoctrine(doctrineId) {
      return loadDoctrineData()
        .then(data => {
          const doctrine = data.doctrines.find(d => d.id === doctrineId);
          return doctrine || null;
        });
    }
    
    /**
     * Get all available doctrines
     * @returns {Promise} - Promise that resolves with an array of doctrines
     */
    function getAllDoctrines() {
      return loadDoctrineData()
        .then(data => data.doctrines);
    }
    
    // Expose public functions
    window.doctrineLoader = {
      loadDoctrineData,
      getDoctrine,
      getAllDoctrines
    };
  })();