// build.sbt — order-service, halfway through the Pekko move
ThisBuild / scalaVersion := "2.13.14"

val AkkaVersion     = "2.9.3"
val AkkaHttpVersion = "10.5.3"

libraryDependencies ++= Seq(
  "com.typesafe.akka"  %% "akka-actor-typed"       % AkkaVersion,
  "com.typesafe.akka"  %% "akka-stream"            % AkkaVersion,
  "com.typesafe.akka"  %% "akka-http"              % AkkaHttpVersion,
  "com.lightbend.akka" %% "akka-stream-alpakka-s3" % "6.0.2",
  "com.typesafe.akka"  %% "akka-stream-kafka"      % "4.0.2",
  "org.apache.pekko"   %% "pekko-connectors-csv"   % "1.0.2",
  "ch.qos.logback"      % "logback-classic"        % "1.5.6"
)
