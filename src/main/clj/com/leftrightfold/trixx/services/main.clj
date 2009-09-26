(ns com.leftrightfold.trixx.services.main
  (:require [com.leftrightfold.trixx.core :as t]
            [com.leftrightfold.trixx.services.core :as ts])
  (:require [compojure :as compojure])
  (:gen-class))

(defn -main [& args]
  (prn "Welcome to Trixx services Repl")
  (t/init)
  (compojure/run-server {:port 8080}
              "/*" (compojure/servlet ts/webservice))
  (clojure.lang.Repl/main (into-array String args)))
