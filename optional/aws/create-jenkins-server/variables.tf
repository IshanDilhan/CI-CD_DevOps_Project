variable "mykey" {
  default = "<YOUR-KEY-PEM-NAME>"
}

variable "git-token" {
  default = "<YOUR-GITHUB-TOKEN>"
  description = "write your github token for private app repo"
}

variable "git-repo-name" {
  default = "jenkins-project-todo-app"
}

variable "backend" {
  default = "<YOUR-S3-BUCKET-NAME>" # unique
  description = "give a unique name for s3 bucket"
}

variable "instancetype" {
  default = "t3a.medium"
}
variable "tag" {
  default = "Jenkins_Server"
}
variable "jenkins-sg" {
  default = "jenkins-server-sec-gr"
}
