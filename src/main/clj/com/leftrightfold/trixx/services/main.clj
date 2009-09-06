(ns com.leftrightfold.trixx.services.main
  (:use com.leftrightfold.trixx.services.core)
  (:use compojure)
  (:gen-class))

(defn -main [& args]
  (prn "Welcome to Trixx services Repl")
  (run-server {:port 8080}
              "/*" (servlet webservice))
  (clojure.lang.Repl/main (into-array String args)))
