(ns com.leftrightfold.trixx.services.core
  (:use com.leftrightfold.trixx.core)
  (:use clojure.contrib.json.write)
  (:use compojure)
  (:use clojure.contrib.str-utils)
  (:import java.net.URLDecoder))

(defn url-decode [param]
  (URLDecoder/decode param "UTF-8"))

(defn trim-slash [s] 
  (if (and (> (count s) 1)
           (= (str (first s)) "/"))
    (apply str (rest s))
    s))

(defn get-exchanges [vhost]
  (json-str (list-exchanges vhost))) 

(defn get-queues [vhost]
  (json-str (list-queues vhost)))

(defn get-bindings [vhost]
  (json-str (list-bindings vhost)))
	
(defn add-user-with-permissions [name password vhost config write read]
  (if (and (add-user name password)
           (set-permissions name vhost {:config config :write write :read read}))
    200 500))

(defn set-user-permissions [name vhost config write read]
  (set-permissions name vhost {:config config :write write :read read}))

(defn user-permissions [name]
  (let [user (list-user-permissions name)]
      (if user [200 (json-str user)] [500 (str "User " name " can't be found.")])))

(defn user-delete [name]
  ;;; figure out how to use compojure.http.request.decodeurl
  (if (delete-user name)
    200 500))

(defn verify-login [name password]
  (if (valid-user name password)
    200 500))

(defn index-page []
  (html
    [:html
     [:head (include-js  "json2.js" "jquery-1.3.2.min.js" "trixx.js")
            (include-css "styles.css")]
     [:body 
      [:img {:src "trixx-rabbit.png"}]
      [:div {:id "header"}]
      [:div {:id "content"}
        [:div {:id "status"}]
        [:div {:id "vhost"}]
        [:div {:id "queue"}]
        [:div {:id "exchange"}]
        [:div {:id "user"}]]
      [:div {:id "footer"}]
     ]
    ]))

(defroutes webservice
  (GET "/exchanges"
    (get-exchanges "/"))
  (GET "/exchanges/*"
    (get-exchanges (trim-slash (url-decode (params :*)))))

  (POST "/exchanges"
    (if (add-exchange (url-decode (params :vhost))
                      (url-decode (params :user))
                      (url-decode (params :password))
                      (url-decode (params :name))
                      (url-decode (params :type))
                      (Boolean/parseBoolean (url-decode (params :durable))))
      200
      500))

  (GET "/queues"
    (get-queues "/"))
  (GET "/queues/*"
    (get-queues (trim-slash (url-decode (params :*)))))

  (GET "/bindings"
    (get-bindings "/"))
  (GET "/bindings/*"
    (get-bindings (trim-slash (url-decode (params :*)))))

  (GET "/vhosts"
    (json-str (list-vhosts)))

  (POST "/vhosts"
    (if (add-vhost (url-decode (params :name)))
         200
         500))

  (GET "/connections"
    (json-str (list-connections)))

  (GET "/users"
    (json-str (list-users)))

  (PUT "/users/:user"
    (set-user-permissions (url-decode (params :name))
                          (url-decode (params :vhost))
                          (url-decode (params :config))
                          (url-decode (params :write))
                          (url-decode (params :read))))

  (POST "/queues"
        (if (add-queue (url-decode (params :vhost))
                       (url-decode (params :user))
                       (url-decode (params :password))
                       (url-decode (params :name))
                       (Boolean/parseBoolean (url-decode (params :durable))))
          200
          500))
  (POST "/users"
    (add-user-with-permissions (url-decode (params :name)) 
                               (url-decode (params :password))
                               (url-decode (params :vhost))
                               (url-decode (params :config))
                               (url-decode (params :write))
                               (url-decode (params :read))))

  (DELETE "/users/:user"
    (user-delete (url-decode (params :user))))

  ;;; needs to handle when user can't be found in trixx
  (GET "/users/:user/permissions"
    (json-str (list-user-permissions (url-decode (params :user)))))

  (GET "/rabbit/status"
    (json-str (status)))
  (PUT "/rabbit/stop"
    (if (stop-app) 200 500))
  (PUT "/rabbit/start"
    (if (start-app) 200 500))
  (PUT "/rabbit/reset"
    (if (reset) 200 500))

  (POST "/authenticate"
    (verify-login (url-decode (params :name))
                  (url-decode (params :password))))

  (GET "/*"
    (or (serve-file (url-decode (params :*))) :next)) 

  (ANY "*" (index-page)))
