port module Ports exposing (..)

-- import Types exposing (..)


port choosePlan : String -> Cmd msg


port tryAgain : String -> Cmd msg

port playCards : String -> Cmd msg

port nextAction : (String -> msg) -> Sub msg
